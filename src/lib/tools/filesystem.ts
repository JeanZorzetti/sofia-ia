
import fs from 'fs/promises';
import path from 'path';

// OpenAI-format tool definitions for native function calling (OpenRouter, Groq, etc.)
export const openaiToolDefinitions = [
    {
        type: 'function' as const,
        function: {
            name: 'list_files',
            description: 'List files and directories in a specific path. Returns [DIR] or [FILE] prefix for each entry.',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The directory path to list (e.g., "." for current directory, or absolute path)',
                    },
                },
                required: ['path'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'read_file',
            description: 'Read the full content of a text file. Truncates files larger than 50kb.',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The file path to read',
                    },
                },
                required: ['path'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'write_file',
            description: 'Write content to a file. Creates the file and any missing parent directories. OVERWRITES existing content entirely. CRITICAL: The content parameter MUST be the COMPLETE, EXACT source code as a plain string. Write real, executable code — NOT summaries, NOT Python dicts, NOT compressed representations. Include all imports, all functions, all exports.',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The file path to write to. Must be a valid relative or absolute file path like "src/app/api/example/route.ts"',
                    },
                    content: {
                        type: 'string',
                        description: 'The COMPLETE source code to write. Must be actual executable code as a plain string. Example for TypeScript: "import { NextResponse } from \'next/server\';\n\nexport async function GET() {\n  return NextResponse.json({ ok: true });\n}"',
                    },
                },
                required: ['path', 'content'],
            },
        },
    },
];

// Read-only tools for models that garble long string arguments (e.g., Qwen3 Coder)
// write_file is handled via parsed markdown code blocks in the text response instead
export const readOnlyToolDefinitions = openaiToolDefinitions.filter(
    t => t.function.name !== 'write_file'
);

export const filesystemTools = {
    definition: [
        {
            name: 'list_files',
            description: 'List files and directories in a specific path',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The directory path to list (e.g., "." for current directory, or absolute path)',
                    },
                },
                required: ['path'],
            },
        },
        {
            name: 'read_file',
            description: 'Read the content of a text file',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The file path to read',
                    },
                },
                required: ['path'],
            },
        },
        {
            name: 'write_file',
            description: 'Write content to a file. OVERWRITES existing content.',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The file path to write to',
                    },
                    content: {
                        type: 'string',
                        description: 'The text content to write',
                    },
                },
                required: ['path', 'content'],
            },
        },
    ],

    async execute(name: string, args: any) {
        try {
            // Normalize path
            const targetPath = args.path ? path.resolve(process.cwd(), args.path) : process.cwd();

            // Basic security check: logic could be added here to restrict paths
            // console.log(`[Filesystem Tool] Executing ${name} on ${targetPath}`);

            switch (name) {
                case 'list_files': {
                    const stats = await fs.stat(targetPath);
                    if (!stats.isDirectory()) {
                        return `Error: path '${targetPath}' is not a directory.`;
                    }
                    const items = await fs.readdir(targetPath, { withFileTypes: true });
                    const listing = items.map(item =>
                        `${item.isDirectory() ? '[DIR]' : '[FILE]'} ${item.name}`
                    ).join('\n');
                    return `Directory listing for ${targetPath}:\n${listing}`;
                }

                case 'read_file': {
                    const content = await fs.readFile(targetPath, 'utf-8');
                    // Truncate if too long to prevent context explosion
                    if (content.length > 50000) {
                        return content.slice(0, 50000) + '\n...[Content truncated (>50kb)]...';
                    }
                    return content;
                }

                case 'write_file': {
                    const fileContent = args.content;

                    // Validate content is actual code, not garbled summaries
                    if (!fileContent || typeof fileContent !== 'string') {
                        return `Error: content must be a non-empty string with actual source code.`;
                    }

                    // Detect Python-dict-like garbled output (common Qwen3 failure mode)
                    const looksGarbled = (
                        (fileContent.startsWith('[{') && fileContent.includes("': '")) ||
                        (fileContent.startsWith('{') && fileContent.includes("': '") && !fileContent.includes('import')) ||
                        (fileContent.includes("'next/server': 'import")) ||
                        fileContent.includes("'success': False") ||
                        fileContent.includes("'success': True")
                    );

                    if (looksGarbled) {
                        return `Error: The content you provided is NOT valid source code. It looks like a compressed/summarized representation. You MUST provide the COMPLETE, ACTUAL source code as a plain string. Write the real TypeScript/JavaScript code with proper imports, function declarations, and exports. Try again with the actual code.`;
                    }

                    // Validate path doesn't look garbled
                    if (args.path.includes("['") || args.path.includes("']")) {
                        return `Error: Invalid file path "${args.path}". The path must be a normal file path like "src/app/api/example/route.ts", not a Python-style list. Try again with a valid path.`;
                    }

                    // Ensure directory exists
                    await fs.mkdir(path.dirname(targetPath), { recursive: true });
                    await fs.writeFile(targetPath, fileContent, 'utf-8');
                    return `Successfully wrote ${fileContent.length} characters to file: ${targetPath}`;
                }

                default:
                    return `Unknown tool function: ${name}`;
            }
        } catch (error: any) {
            return `Error executing ${name}: ${error.message}`;
        }
    }
};

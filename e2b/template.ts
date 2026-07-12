import { Template } from 'e2b'

export const template = Template()
  .fromImage('node:20')
  .setUser('root')
  .setWorkdir('/')
  .runCmd('apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*')
  .runCmd('npm install -g @anthropic-ai/claude-code && (claude --version || true)')
  .setUser('user')
  .setWorkdir('/home/user')
/**
 * 🧪 Teste do Endpoint DELETE WhatsApp Instances
 */

const testDeleteEndpoint = async () => {
    console.log('🗑️ TESTE: Endpoint DELETE WhatsApp Instances');
    console.log('===============================================');
    
    try {
        // 1. Listar instâncias antes
        console.log('📱 1. Listando instâncias antes do delete...');
        const listBefore = await fetch('http://localhost:8000/api/whatsapp/instances');
        const beforeData = await listBefore.json();
        
        console.log(`📊 Instâncias encontradas: ${beforeData.data.length}`);
        beforeData.data.forEach(instance => {
            console.log(`   - ${instance.name} (${instance.status})`);
        });
        
        // 2. Tentar deletar uma instância
        console.log('\n🗑️ 2. Deletando instância "sofia-backup"...');
        const deleteResponse = await fetch('http://localhost:8000/api/whatsapp/instances/sofia-backup', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const deleteData = await deleteResponse.json();
        console.log(`📤 Status: ${deleteResponse.status}`);
        console.log(`📄 Resposta:`, deleteData);
        
        // 3. Listar instâncias depois
        console.log('\n📱 3. Listando instâncias após delete...');
        const listAfter = await fetch('http://localhost:8000/api/whatsapp/instances');
        const afterData = await listAfter.json();
        
        console.log(`📊 Instâncias restantes: ${afterData.data.length}`);
        afterData.data.forEach(instance => {
            console.log(`   - ${instance.name} (${instance.status})`);
        });
        
        // 4. Verificar resultado
        console.log('\n✅ RESULTADO DO TESTE:');
        if (deleteData.success && afterData.data.length < beforeData.data.length) {
            console.log('🎉 ENDPOINT DELETE FUNCIONANDO PERFEITAMENTE!');
            console.log(`📉 Reduziu de ${beforeData.data.length} para ${afterData.data.length} instâncias`);
        } else {
            console.log('❌ PROBLEMA: Delete não funcionou corretamente');
        }
        
    } catch (error) {
        console.error('❌ ERRO no teste:', error.message);
    }
};

// Executar teste
testDeleteEndpoint();
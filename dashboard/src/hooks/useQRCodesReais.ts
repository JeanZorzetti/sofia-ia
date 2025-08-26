/**
 * 🔥 HOOK ESPECÍFICO: QR Codes REAIS para Produção
 * Configuração direta para sofia-api.roilabs.com.br
 * ELIMINA simulação e força integração real com Evolution API
 */

import { useState, useCallback } from 'react';

// 🎯 CONFIGURAÇÃO: CORRIGIDO PARA USAR .env
const PRODUCTION_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const EVOLUTION_API_BASE = 'https://evolutionapi.roilabs.com.br';

interface QRCodeResponse {
  success: boolean;
  data: {
    qr_code: string;
    status: string;
    instance_id: string;
    expires_in: number;
    source: 'evolution_api' | 'memory_cache';
    api_url: string;
    webhook_configured: boolean;
  };
  error?: string;
  timestamp: string;
}

interface QRCodeState {
  qr_code: string | null;
  loading: boolean;
  error: string | null;
  instance_id: string | null;
  expires_in: number;
  source: string;
  api_url: string;
  last_updated: string;
}

export const useQRCodesReais = () => {
  const [qrState, setQrState] = useState<QRCodeState>({
    qr_code: null,
    loading: false,
    error: null,
    instance_id: null,
    expires_in: 0,
    source: 'unknown',
    api_url: '',
    last_updated: ''
  });

  // 🔥 GERAR QR CODE REAL via backend unificado
  const generateRealQRCode = useCallback(async (instanceName: string): Promise<string> => {
    try {
      setQrState(prev => ({ ...prev, loading: true, error: null }));

      console.log('🔥 GERANDO QR CODE REAL:', {
        instanceName,
        api: PRODUCTION_API_BASE,
        timestamp: new Date().toISOString()
      });

      // Passo 1: Criar instância no backend
      const createResponse = await fetch(`${PRODUCTION_API_BASE}/api/instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          instanceName: instanceName,
          settings: { evolution_api_url: EVOLUTION_API_BASE }
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Erro ao criar instância: ${createResponse.status}`);
      }

      const createResult = await createResponse.json();
      
      if (!createResult.success) {
        throw new Error(createResult.error || 'Erro ao criar instância');
      }

      const instanceId: string = createResult.data?.instanceName || createResult.data?.instance_id || instanceName;

      // Passo 2: Obter QR Code da instância pelo endpoint principal
      // Tenta primeira vez sem esperar (o backend pode ter cacheado o QR do create)
      const qrResponse = await fetch(`${PRODUCTION_API_BASE}/api/instances/${encodeURIComponent(instanceId)}/qrcode`);

      if (!qrResponse.ok) {
        throw new Error(`Erro ao obter QR Code: ${qrResponse.status}`);
      }

      const qrResult: QRCodeResponse = await qrResponse.json();

      let finalQrResult = qrResult;
      
      if (!qrResult.success || !qrResult.data?.qr_code) {
        // Pequeno retry rápido (500ms) para capturar QR cacheado logo após o create
        await new Promise(r => setTimeout(r, 500));
        const retry = await fetch(`${PRODUCTION_API_BASE}/api/instances/${encodeURIComponent(instanceId)}/qrcode`);
        const retryJson: QRCodeResponse = await retry.json();
        if (!retryJson.success || !retryJson.data?.qr_code) {
          throw new Error(retryJson.error || 'Erro ao gerar QR Code');
        }
        finalQrResult = retryJson;
      }

      // Passo 3: Atualizar estado com dados reais
      setQrState({
        qr_code: finalQrResult.data.qr_code,
        loading: false,
        error: null,
        instance_id: finalQrResult.data.instance_id || instanceId,
        expires_in: finalQrResult.data.expires_in || 300,
        source: finalQrResult.data.source || 'evolution_api',
        api_url: PRODUCTION_API_BASE,
        last_updated: new Date().toISOString()
      });

      console.log('✅ QR CODE REAL GERADO:', {
        instanceId: finalQrResult.data.instance_id,
        source: finalQrResult.data.source,
        api_url: finalQrResult.data.api_url,
        webhook: finalQrResult.data.webhook_configured,
        expires_in: finalQrResult.data.expires_in
      });

      return finalQrResult.data.qr_code;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      console.error('❌ ERRO AO GERAR QR CODE REAL:', {
        error: errorMsg,
        api: PRODUCTION_API_BASE,
        timestamp: new Date().toISOString()
      });

      setQrState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
        last_updated: new Date().toISOString()
      }));

      throw new Error(`Falha ao gerar QR Code: ${errorMsg}`);
    }
  }, []);

  // 🔄 REFRESH QR CODE (quando expira)
  const refreshQRCode = useCallback(async (instanceId: string): Promise<string> => {
    try {
      setQrState(prev => ({ ...prev, loading: true, error: null }));

      // nosso backend usa GET com query refresh=true
      const response = await fetch(`${PRODUCTION_API_BASE}/api/instances/${encodeURIComponent(instanceId)}/qrcode?refresh=true`);

      if (!response.ok) {
        throw new Error(`Erro ao refresh QR: ${response.status}`);
      }

      const result: QRCodeResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer refresh do QR Code');
      }

      setQrState(prev => ({
        ...prev,
        qr_code: result.data.qr_code,
        loading: false,
        expires_in: result.data.expires_in || 300,
        last_updated: new Date().toISOString()
      }));

      return result.data.qr_code;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setQrState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
        last_updated: new Date().toISOString()
      }));

      throw new Error(`Falha ao refresh QR Code: ${errorMsg}`);
    }
  }, []);

  // 🎯 VALIDAR STATUS DA INSTÂNCIA
  const checkInstanceStatus = useCallback(async (instanceId: string) => {
    try {
      const response = await fetch(`${PRODUCTION_API_BASE}/api/instances/${instanceId}/status`);
      
      if (!response.ok) {
        throw new Error(`Erro ao verificar status: ${response.status}`);
      }

      const result = await response.json();
      return result.data?.status || 'unknown';

    } catch (error) {
      console.error('Erro ao verificar status da instância:', error);
      return 'error';
    }
  }, []);

  // 🧹 LIMPAR ESTADO
  const clearQRState = useCallback(() => {
    setQrState({
      qr_code: null,
      loading: false,
      error: null,
      instance_id: null,
      expires_in: 0,
      source: 'unknown',
      api_url: '',
      last_updated: ''
    });
  }, []);

  // 🔍 DIAGNÓSTICO COMPLETO
  const diagnosticoCompleto = useCallback(() => {
    return {
      config: {
        production_api: PRODUCTION_API_BASE,
        evolution_api: EVOLUTION_API_BASE,
        timestamp: new Date().toISOString()
      },
      state: qrState,
      methods: {
        generateRealQRCode: 'Gera QR Code conectável real',
        refreshQRCode: 'Atualiza QR Code expirado',
        checkInstanceStatus: 'Verifica status da instância',
        clearQRState: 'Limpa estado do hook'
      }
    };
  }, [qrState]);

  return {
    // Estado
    qrCode: qrState.qr_code,
    loading: qrState.loading,
    error: qrState.error,
    instanceId: qrState.instance_id,
    expiresIn: qrState.expires_in,
    source: qrState.source,
    apiUrl: qrState.api_url,
    lastUpdated: qrState.last_updated,
    
    // Métodos
    generateRealQRCode,
    refreshQRCode,
    checkInstanceStatus,
    clearQRState,
    diagnosticoCompleto
  };
};
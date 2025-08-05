/**
 * 🚨 CORREÇÃO URGENTE: String QR muito longa (13152 chars)
 * Implementar fallback para strings grandes + debug
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  QrCode, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Smartphone,
  Users,
  Clock,
  RefreshCw,
  X,
  Wifi,
  WifiOff,
  Trash2,
  Zap,
  Copy
} from 'lucide-react';
import { useWhatsAppInstances, useRealTimeStats } from '@/hooks/useSofiaApi';
import { useQRCodesReais } from '@/hooks/useQRCodesReais';
import { FORCE_QR_REFRESH, PRODUCTION_CONFIG } from '@/force-qr-refresh';

// 🔥 CARREGAR QRCode.js do CDN
const loadQRCodeJS = () => {
  return new Promise((resolve, reject) => {
    if (window.QRCode) {
      resolve(window.QRCode);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = () => resolve(window.QRCode);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export const WhatsAppTab = () => {
  // 🔗 Hooks para dados reais
  const { 
    instances, 
    loading, 
    error, 
    createInstance, 
    disconnectInstance, 
    deleteInstance, 
    pauseAutoRefresh, 
    resumeAutoRefresh, 
    refresh 
  } = useWhatsAppInstances();
  
  // 🔥 Hook para QR codes REAIS
  const {
    qrCode: realQRCode,
    loading: qrLoading,
    error: qrError,
    instanceId: qrInstanceId,
    source: qrSource,
    generateRealQRCode,
    clearQRState,
  } = useQRCodesReais();
  
  // 🛠️ Estados para o modal e QR local
  const [modalOpen, setModalOpen] = useState(false);
  const { stats: realTimeStats } = useRealTimeStats(modalOpen);
  const [showQR, setShowQR] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingInstance, setDeletingInstance] = useState<string | null>(null);
  
  // 🔥 Estados para QRCode.js LOCAL com debug
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [qrInstance, setQrInstance] = useState<any>(null);
  const [qrCodeReady, setQrCodeReady] = useState(false);
  const [qrLibraryLoaded, setQrLibraryLoaded] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [generationAttempt, setGenerationAttempt] = useState(0);
  const [useImageFallback, setUseImageFallback] = useState(false);

  // 🔥 CARREGAR QRCode.js quando modal abrir
  useEffect(() => {
    if (showQR && !qrLibraryLoaded) {
      console.log('📦 Carregando QRCode.js...');
      loadQRCodeJS()
        .then(() => {
          console.log('✅ QRCode.js carregado com sucesso');
          setQrLibraryLoaded(true);
        })
        .catch((error) => {
          console.error('❌ Erro ao carregar QRCode.js:', error);
          setQrError('Erro ao carregar biblioteca QR');
        });
    }
  }, [showQR, qrLibraryLoaded]);

  // 🚨 DETECTAR QR STRING MUITO LONGA + FALLBACK
  const generateQRWithFallback = (qrText: string) => {
    console.log('🔥 GERANDO QR:', {
      length: qrText.length,
      firstChars: qrText.substring(0, 50),
      attempt: generationAttempt + 1
    });

    // 🚨 Se string muito longa (>2000 chars), usar APIs externas como fallback
    if (qrText.length > 2000) {
      console.log('⚠️ STRING MUITO LONGA, usando fallback de imagem');
      setUseImageFallback(true);
      
      // Fallback: usar API externa para strings muito longas
      const fallbackUrls = [
        `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrText)}`,
        `https://chart.googleapis.com/chart?chs=180x180&cht=qr&chl=${encodeURIComponent(qrText)}`,
        `https://quickchart.io/qr?text=${encodeURIComponent(qrText)}&size=180`
      ];
      
      const img = document.createElement('img');
      img.src = fallbackUrls[Math.min(generationAttempt, 2)];
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      
      img.onload = () => {
        console.log('✅ QR Fallback carregado');
        setQrCodeReady(true);
        setQrError(null);
      };
      
      img.onerror = () => {
        console.error('❌ QR Fallback falhou');
        if (generationAttempt < 2) {
          setGenerationAttempt(prev => prev + 1);
          setTimeout(() => generateQRWithFallback(qrText), 1000);
        } else {
          setQrError('Todas as tentativas falharam');
        }
      };
      
      if (qrContainerRef.current) {
        qrContainerRef.current.innerHTML = '';
        qrContainerRef.current.appendChild(img);
      }
      
      return;
    }

    // 🔥 TENTAR QRCode.js LOCAL para strings normais
    if (!qrContainerRef.current || !window.QRCode) {
      console.error('❌ Container ou biblioteca não disponível');
      setQrError('Container não encontrado');
      return;
    }
    
    try {
      // Limpar container
      qrContainerRef.current.innerHTML = '';
      
      // Tentar gerar QR local
      const qr = new window.QRCode(qrContainerRef.current, {
        text: qrText,
        width: 180,
        height: 180,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.L // Menor correção para strings grandes
      });
      
      setQrInstance(qr);
      setQrCodeReady(true);
      setQrError(null);
      setUseImageFallback(false);
      console.log('✅ QR Code LOCAL gerado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro QRCode.js local:', error);
      
      // Se falhar, tentar fallback
      if (generationAttempt < 3) {
        console.log('🔄 Tentando fallback...');
        setGenerationAttempt(prev => prev + 1);
        setTimeout(() => generateQRWithFallback(qrText), 500);
      } else {
        setQrError(`Erro ao gerar QR: ${error.message}`);
      }
    }
  };

  // 🔥 GERAR QR quando receber string da Evolution API
  useEffect(() => {
    if (realQRCode && qrLibraryLoaded && qrContainerRef.current) {
      console.log('🎯 INICIANDO GERAÇÃO QR:', {
        hasQR: !!realQRCode,
        length: realQRCode.length,
        libraryLoaded: qrLibraryLoaded,
        containerReady: !!qrContainerRef.current
      });
      
      setQrCodeReady(false);
      setQrError(null);
      setGenerationAttempt(0);
      setUseImageFallback(false);
      
      // Delay pequeno para garantir que DOM está pronto
      setTimeout(() => {
        generateQRWithFallback(realQRCode);
      }, 100);
    }
  }, [realQRCode, qrLibraryLoaded]);

  // 🛠️ Controlar auto-refresh quando modal abrir/fechar
  useEffect(() => {
    if (showQR) {
      setModalOpen(true);
      pauseAutoRefresh?.();
    } else {
      setModalOpen(false);
      resumeAutoRefresh?.();
      clearQRState();
      setQrCodeReady(false);
      setQrInstance(null);
      setQrError(null);
      setGenerationAttempt(0);
      setUseImageFallback(false);
      if (qrContainerRef.current) {
        qrContainerRef.current.innerHTML = '';
      }
    }
  }, [showQR, pauseAutoRefresh, resumeAutoRefresh, clearQRState]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'disconnected': return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'connecting': return <RefreshCw className="h-4 w-4 text-yellow-400 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'disconnected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'connecting': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // 🔥 CRIAR INSTÂNCIA COM QR REAL
  const handleCreateInstanceReal = async () => {
    if (!newInstanceName.trim()) return;
    
    try {
      setIsCreating(true);
      setQrCodeReady(false);
      setQrError(null);
      
      console.log('🔥 CRIANDO INSTÂNCIA COM QR REAL:', {
        instanceName: newInstanceName,
        production: PRODUCTION_CONFIG
      });

      const realQR = await generateRealQRCode(newInstanceName);
      
      console.log('✅ QR CODE REAL RECEBIDO:', {
        hasQR: !!realQR,
        source: qrSource,
        instanceId: qrInstanceId,
        qrLength: realQR?.length
      });
      
    } catch (err) {
      console.error('❌ ERRO AO CRIAR INSTÂNCIA REAL:', err);
      alert(`Erro ao criar instância: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsCreating(false);
    }
  };

  // 🔄 RETRY MANUAL
  const handleRetryQR = () => {
    if (realQRCode) {
      console.log('🔄 RETRY MANUAL do QR');
      setGenerationAttempt(0);
      setQrCodeReady(false);
      setQrError(null);
      generateQRWithFallback(realQRCode);
    }
  };

  // 📋 COPIAR QR para área de transferência
  const handleCopyQR = () => {
    if (realQRCode) {
      navigator.clipboard.writeText(realQRCode);
      alert('QR copiado para área de transferência!');
    }
  };

  // Resto das funções...
  const handleDisconnect = async (instanceId: string) => {
    try {
      await disconnectInstance(instanceId);
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    }
  };

  const handleDeleteInstance = async (instanceId: string, instanceName: string) => {
    const confirmed = window.confirm(
      `⚠️ Tem certeza que deseja excluir a instância "${instanceName}"?\n\nEsta ação não pode ser desfeita.`
    );
    
    if (!confirmed) return;
    
    try {
      setDeletingInstance(instanceId);
      await deleteInstance(instanceId);
    } catch (err) {
      console.error('Erro ao deletar instância:', err);
      alert('Erro ao excluir instância. Tente novamente.');
    } finally {
      setDeletingInstance(null);
    }
  };

  const handleCloseModal = () => {
    setShowQR(false);
    setNewInstanceName('');
    clearQRState();
    setQrCodeReady(false);
    setQrInstance(null);
    setQrError(null);
    setGenerationAttempt(0);
    if (qrContainerRef.current) {
      qrContainerRef.current.innerHTML = '';
    }
  };

  const connectedCount = instances.filter(i => i.status === 'connected').length;
  const disconnectedCount = instances.filter(i => i.status === 'disconnected').length;
  const totalMessages = instances.reduce((sum, i) => sum + i.messagesCount, 0);

  // 🔥 MODAL COM DEBUG MELHORADO
  const QRModal = () => {
    if (!showQR) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="glass-card w-full max-w-2xl">
          <CardHeader className="relative text-center pb-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCloseModal}
              className="absolute top-2 right-2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-3 relative">
              <Smartphone className="h-6 w-6 text-primary-foreground" />
              {PRODUCTION_CONFIG.FORCE_REAL_QR && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <Zap className="h-2 w-2 text-white" />
                </div>
              )}
            </div>
            
            <CardTitle className="text-foreground font-light tracking-wider-sofia text-lg">
              Nova Instância WhatsApp
              <span className="block text-xs text-green-400 mt-1">
                🔥 QR Inteligente (LOCAL + Fallback)
              </span>
            </CardTitle>
            <p className="text-foreground-secondary text-sm">
              Crie uma nova instância e conecte seu WhatsApp
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* 🔥 LAYOUT HORIZONTAL: Input + QR INTELIGENTE */}
            <div className="grid grid-cols-2 gap-6">
              {/* Coluna ESQUERDA: Input e Status */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-light text-foreground-secondary">
                    Nome da Instância
                  </label>
                  <Input
                    placeholder="Ex: Sofia Principal"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    className="bg-background-secondary border-glass-border text-foreground"
                    autoFocus
                    disabled={isCreating || qrLoading}
                  />
                </div>

                {/* Status com debug */}
                {qrError && (
                  <div className="bg-red-500/20 text-red-400 p-3 rounded text-xs">
                    <div className="font-medium">❌ Erro QR:</div>
                    <div>{qrError}</div>
                  </div>
                )}
                
                {realQRCode && qrSource && (
                  <div className="bg-green-500/20 text-green-400 p-3 rounded text-xs">
                    <div className="font-medium">✅ QR Recebido</div>
                    <div className="space-y-1 mt-2">
                      <div>• Fonte: {qrSource}</div>
                      <div>• Chars: {realQRCode.length}</div>
                      <div>• Método: {useImageFallback ? 'API Fallback' : 'QRCode.js LOCAL'}</div>
                      <div>• Tentativa: {generationAttempt + 1}/4</div>
                      <div>• Status: {qrCodeReady ? '✅ Pronto' : qrError ? '❌ Erro' : '🔄 Gerando'}</div>
                    </div>
                  </div>
                )}

                {/* Instruções de uso */}
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded text-xs text-blue-400">
                  <div className="font-medium mb-2">📱 Como conectar:</div>
                  <div className="space-y-1">
                    <div>1. Abra o WhatsApp</div>
                    <div>2. Vá em ⚙️ Configurações</div>
                    <div>3. Aparelhos conectados</div>
                    <div>4. ➕ Conectar aparelho</div>
                    <div>5. Escaneie o QR ao lado →</div>
                  </div>
                </div>
              </div>

              {/* Coluna DIREITA: QR Code INTELIGENTE */}
              <div className="flex flex-col items-center justify-center">
                <div className="bg-white rounded-lg p-3 mb-3" style={{ width: '200px', height: '200px' }}>
                  {!qrLibraryLoaded ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                      <span className="text-xs text-gray-500">Carregando QRCode.js...</span>
                    </div>
                  ) : !realQRCode ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-2"></div>
                      <span className="text-xs text-gray-500">Aguardando QR...</span>
                    </div>
                  ) : qrError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                      <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                      <span className="text-xs text-red-600 text-center mb-2">{qrError}</span>
                      <button 
                        onClick={handleRetryQR}
                        className="text-xs bg-red-500 text-white px-2 py-1 rounded"
                      >
                        🔄 Tentar Novamente
                      </button>
                    </div>
                  ) : (
                    <div 
                      ref={qrContainerRef}
                      className="w-full h-full flex items-center justify-center"
                    >
                      {!qrCodeReady && (
                        <div className="text-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-1" />
                          <div className="text-xs text-gray-500">
                            {useImageFallback ? 'Carregando API...' : 'Gerando local...'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Status e ações */}
                <div className="text-center text-xs space-y-2">
                  {qrCodeReady && (
                    <div className="text-green-400">
                      ✅ QR {useImageFallback ? 'Fallback' : 'Local'} pronto!
                    </div>
                  )}
                  
                  {realQRCode && (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleRetryQR}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                      >
                        🔄 Retry
                      </button>
                      <button 
                        onClick={handleCopyQR}
                        className="text-xs bg-gray-500 text-white px-2 py-1 rounded"
                      >
                        📋 Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-3 border-t border-glass-border">
              <Button 
                className="flex-1 button-luxury" 
                onClick={handleCreateInstanceReal}
                disabled={!newInstanceName.trim() || isCreating || qrLoading}
              >
                {isCreating || qrLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {isCreating ? 'Criando...' : qrLoading ? 'Gerando...' : 'Criar Instância'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleCloseModal}
                disabled={isCreating || qrLoading}
                className="px-6"
              >
                Cancelar
              </Button>
            </div>

            {/* Debug completo */}
            <details className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
              <summary>🔍 Debug Completo</summary>
              <div className="mt-2 space-y-1">
                <div>Library: {qrLibraryLoaded ? '✅ Loaded' : '❌ Not Loaded'}</div>
                <div>QR Length: {realQRCode?.length || 'N/A'}</div>
                <div>Container: {qrContainerRef.current ? '✅ Ready' : '❌ Not Ready'}</div>
                <div>Ready: {qrCodeReady ? '✅ Yes' : '❌ No'}</div>
                <div>Error: {qrError || 'None'}</div>
                <div>Method: {useImageFallback ? 'API Fallback' : 'QRCode.js'}</div>
                <div>Attempt: {generationAttempt + 1}</div>
                <div>QR Preview: {realQRCode ? `${realQRCode.substring(0, 50)}...` : 'N/A'}</div>
              </div>
            </details>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
          <h2 className="text-foreground">Carregando Instâncias WhatsApp...</h2>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-fade-in-up">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-foreground">Facilitador WhatsApp</h2>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <Zap className="h-3 w-3 mr-1" />
              QR Inteligente
            </Badge>
          </div>
          <p className="text-foreground-secondary">
            Conecte e gerencie suas instâncias do WhatsApp
          </p>
        </div>

        <div className="flex justify-between items-center">
          <Button className="button-luxury" onClick={() => setShowQR(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Instância
          </Button>
          
          <div className="flex items-center space-x-6">
            <Button variant="ghost" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            
            <div className="flex items-center space-x-4 text-sm text-foreground-secondary">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>{connectedCount} Conectado{connectedCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>{disconnectedCount} Desconectado{disconnectedCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground-secondary text-sm">Mensagens Hoje</p>
                  <p className="text-2xl font-extralight text-foreground">
                    {realTimeStats?.active_conversations || totalMessages}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground-secondary text-sm">Conversas Ativas</p>
                  <p className="text-2xl font-extralight text-foreground">
                    {realTimeStats?.active_conversations || Math.floor(totalMessages * 0.15)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground-secondary text-sm">Tempo Resposta</p>
                  <p className="text-2xl font-extralight text-foreground">
                    {realTimeStats?.avg_response_time || '1.2s'}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resto do componente continua igual... */}
        <div className="space-y-6">
          <h3 className="text-xl font-light text-foreground tracking-wider-sofia">
            Instâncias Conectadas
          </h3>
          
          {error && (
            <Card className="glass-card border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>Erro: {error}</span>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {instances.map((instance) => (
              <Card key={instance.id} className="glass-card hover-scale">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        instance.status === 'connected' ? 'bg-green-500' : 
                        instance.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        <Smartphone className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-foreground font-light tracking-wider-sofia">
                          {instance.name}
                        </CardTitle>
                        <p className="text-foreground-secondary text-sm">
                          {instance.phone}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(instance.status)} border`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(instance.status)}
                        <span className="capitalize">
                          {instance.status === 'connected' ? 'Conectado' : 
                           instance.status === 'connecting' ? 'Conectando' : 'Desconectado'}
                        </span>
                      </div>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-foreground-secondary">Mensagens</p>
                      <p className="text-lg font-light text-foreground">
                        {instance.messagesCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground-secondary">Última atividade</p>
                      <p className="text-lg font-light text-foreground">
                        {instance.last_activity}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-glass-border">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowQR(true)}>
                        <QrCode className="h-4 w-4 mr-1" />
                        QR
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className={instance.status === 'connected' ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}
                        onClick={() => {
                          if (instance.status === 'connected') {
                            handleDisconnect(instance.id);
                          }
                        }}
                      >
                        {instance.status === 'connected' ? (
                          <>
                            <WifiOff className="h-4 w-4 mr-1" />
                            Desconectar
                          </>
                        ) : (
                          <>
                            <Wifi className="h-4 w-4 mr-1" />
                            Reconectar
                          </>
                        )}
                      </Button>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleDeleteInstance(instance.id, instance.name)}
                      disabled={deletingInstance === instance.id}
                    >
                      {deletingInstance === instance.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {instances.length === 0 && !loading && (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Smartphone className="h-12 w-12 text-foreground-tertiary mx-auto mb-4" />
                <h3 className="text-foreground font-light mb-2">Nenhuma instância configurada</h3>
                <p className="text-foreground-secondary mb-4">
                  Crie sua primeira instância para começar a usar o Sofia IA
                </p>
                <Button className="button-luxury" onClick={() => setShowQR(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Instância
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-foreground font-light tracking-wider-sofia">
              Como Conectar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-light text-foreground">Primeira Conexão</h4>
                <ol className="space-y-2 text-foreground-secondary">
                  <li className="flex items-start space-x-2">
                    <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center mt-0.5">1</span>
                    <span>Clique em "Nova Instância"</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center mt-0.5">2</span>
                    <span>Digite um nome para sua instância</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center mt-0.5">3</span>
                    <span>Escaneie o QR Code com seu WhatsApp</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center mt-0.5">4</span>
                    <span>Aguarde a confirmação de conexão</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-4">
                <h4 className="font-light text-foreground">Recursos Disponíveis</h4>
                <ul className="space-y-2 text-foreground-secondary">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>QR Inteligente (Local + API Fallback)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Respostas automáticas com Sofia IA</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Qualificação automática de leads</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Integração com CRM</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Múltiplas instâncias simultâneas</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <QRModal />
    </>
  );
};
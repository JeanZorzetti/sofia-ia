import React, { useState, useEffect } from 'react';
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
  Zap
} from 'lucide-react';
import { useWhatsAppInstances, useRealTimeStats } from '@/hooks/useSofiaApi';
import { useQRCodesReais } from '@/hooks/useQRCodesReais';
import { FORCE_QR_REFRESH, PRODUCTION_CONFIG } from '@/force-qr-refresh';

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
  
  // 🔥 NOVO: Hook para QR codes REAIS
  const {
    qrCode: realQRCode,
    loading: qrLoading,
    error: qrError,
    instanceId: qrInstanceId,
    source: qrSource,
    generateRealQRCode,
    clearQRState,
    diagnosticoCompleto
  } = useQRCodesReais();
  
  // 🛠️ CORREÇÃO: Stats com controle de pausa quando modal aberto
  const [modalOpen, setModalOpen] = useState(false);
  const { stats: realTimeStats } = useRealTimeStats(modalOpen);
  
  // 🎛️ Estados locais
  const [showQR, setShowQR] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingInstance, setDeletingInstance] = useState<string | null>(null);

  // 🛠️ CORREÇÃO: Controlar auto-refresh quando modal abrir/fechar
  useEffect(() => {
    if (showQR) {
      setModalOpen(true);
      pauseAutoRefresh?.();
    } else {
      setModalOpen(false);
      resumeAutoRefresh?.();
      clearQRState(); // Limpar QR quando modal fecha
    }
  }, [showQR, pauseAutoRefresh, resumeAutoRefresh, clearQRState]);

  // 🔥 LOG de debug para produção
  useEffect(() => {
    console.log('🔥 WhatsApp Tab - Configuração Produção:', {
      FORCE_QR_REFRESH,
      PRODUCTION_CONFIG,
      realQRCode: !!realQRCode,
      qrSource
    });
  }, [realQRCode, qrSource]);

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

  // 🔥 NOVO: Criar instância com QR REAL
  const handleCreateInstanceReal = async () => {
    if (!newInstanceName.trim()) return;
    
    try {
      setIsCreating(true);
      
      console.log('🔥 CRIANDO INSTÂNCIA COM QR REAL:', {
        instanceName: newInstanceName,
        production: PRODUCTION_CONFIG
      });

      // Gerar QR Code REAL (não simulado)
      const realQR = await generateRealQRCode(newInstanceName);
      
      console.log('✅ QR CODE REAL GERADO:', {
        hasQR: !!realQR,
        source: qrSource,
        instanceId: qrInstanceId
      });

      // Se QR foi gerado com sucesso, manter modal aberto
      // para usuário escanear
      
    } catch (err) {
      console.error('❌ ERRO AO CRIAR INSTÂNCIA REAL:', err);
      alert(`Erro ao criar instância: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsCreating(false);
    }
  };

  // 🔌 Desconectar instância
  const handleDisconnect = async (instanceId: string) => {
    try {
      await disconnectInstance(instanceId);
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    }
  };

  // 🗑️ Deletar instância com confirmação
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

  // 🛠️ CORREÇÃO: Fechar modal com limpeza
  const handleCloseModal = () => {
    setShowQR(false);
    setNewInstanceName('');
    clearQRState();
  };

  // 📊 Calcular estatísticas
  const connectedCount = instances.filter(i => i.status === 'connected').length;
  const disconnectedCount = instances.filter(i => i.status === 'disconnected').length;
  const totalMessages = instances.reduce((sum, i) => sum + i.messagesCount, 0);

  // 🔥 MODAL ATUALIZADO: QR Codes REAIS
  const QRModal = () => {
    if (!showQR) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="glass-card w-full max-w-md">
          <CardHeader className="relative text-center pb-4">
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
            
            <CardTitle className="text-foreground font-light tracking-wider-sofia">
              Nova Instância WhatsApp
              {PRODUCTION_CONFIG.FORCE_REAL_QR && (
                <span className="block text-xs text-green-400 mt-1">
                  🔥 QR Codes REAIS (Produção)
                </span>
              )}
            </CardTitle>
            <p className="text-foreground-secondary text-sm">
              Crie uma nova instância e conecte seu WhatsApp
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-light text-foreground-secondary">
                Nome da Instância
              </label>
              <Input
                key="instance-name-input"
                placeholder="Ex: Sofia Principal"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                className="bg-background-secondary border-glass-border text-foreground"
                autoFocus
                disabled={isCreating || qrLoading}
              />
            </div>

            <div className="bg-white rounded-lg p-4 mx-auto" style={{ width: '200px', height: '200px' }}>
              {qrLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : realQRCode ? (
                <div className="w-full h-full relative">
                  <img 
                    src={realQRCode} 
                    alt="QR Code Real" 
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                    REAL
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-black/10 rounded grid grid-cols-10 gap-px">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-sm ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`}
                    />
                  ))}
                  <div className="col-span-10 text-center text-xs text-gray-500 mt-2">
                    Simulação
                  </div>
                </div>
              )}
            </div>

            {qrError && (
              <div className="bg-red-500/20 text-red-400 p-2 rounded text-sm text-center">
                ❌ {qrError}
              </div>
            )}
            
            {realQRCode && qrSource && (
              <div className="bg-green-500/20 text-green-400 p-2 rounded text-sm text-center">
                ✅ QR Code ativo (fonte: {qrSource})
              </div>
            )}

            <div className="bg-background-secondary/50 rounded-lg p-3 text-center space-y-1">
              <p className="text-xs text-foreground-secondary font-medium">
                📱 Como Conectar:
              </p>
              <p className="text-xs text-foreground-secondary">
                WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho → Escanear QR
              </p>
            </div>

            <div className="flex gap-3 pt-2">
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
                {isCreating ? 'Criando...' : qrLoading ? 'Gerando QR...' : 'Criar Instância'}
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

            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                Debug: QR={!!realQRCode}, Source={qrSource}, ID={qrInstanceId}
              </div>
            )}
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
            {PRODUCTION_CONFIG.FORCE_REAL_QR && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <Zap className="h-3 w-3 mr-1" />
                QR Reais
              </Badge>
            )}
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
                    <span>Relatórios de conversas</span>
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
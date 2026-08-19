import React, { useState, useEffect } from 'react';
import { Shield, Activity, Users, AlertTriangle, ActivitySquare, CheckCircle, XCircle, ArrowLeft, Server, Lock, Search, SearchX, Ban, UserCheck, Key, Database, BookOpen, Check, X, Cpu, SearchCode } from 'lucide-react';
import { supabase } from '../../services/supabaseClient.ts';
import type { AuditLog, User } from '../../types.ts';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext.tsx';
import { TelemetryDashboard } from './TelemetryDashboard.tsx';
import { RescueAccountPanel } from './RescueAccountPanel';
import { AdminAiInspectorTab } from './AiInspector/AdminAiInspectorTab';
import { RagInspector } from './RagInspector';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<User[]>([]);
  const [unknownConcepts, setUnknownConcepts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ dau: 0, mau: 0, totalUsers: 0 });
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'monitoring' | 'users' | 'curation' | 'ai_telemetry' | 'rescue' | 'ai_inspector' | 'rag_inspector'>('monitoring');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Audit Logs
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (auditData) {
          setLogs(auditData.map(log => ({
              id: log.id,
              userId: log.actor_id,
              userEmail: 'Oculto via RLS', 
              action: log.action,
              resource: log.resource,
              timestamp: log.created_at,
              details: log.details,
              ipAddress: log.ip_address
          } as AuditLog)));
      }

      // 2. Fetch Login Attempts
      const { data: loginData } = await supabase
        .from('login_attempts')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(100);
      
      if (loginData) setLoginAttempts(loginData);

      // 3. Fetch Profiles (Users)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (profilesData) {
        setProfiles(profilesData);
        setMetrics(prev => ({ ...prev, totalUsers: profilesData.length }));
      }

      // 4. Fetch Unknown Concepts (Curation Backlog)
      const { data: conceptsData } = await supabase
        .from('unknown_concepts_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (conceptsData) setUnknownConcepts(conceptsData);

    } catch (error) {
      console.error('Admin Dashboard Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    
    // Optimistic UI Update
    setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, status: newStatus } : p));
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', user.id);
        
      if (error) throw error;
      addToast(`Usuário ${newStatus === 'blocked' ? 'bloqueado' : 'desbloqueado'} com sucesso.`, 'success');
    } catch (err) {
      console.error(err);
      addToast("Erro ao alterar status do usuário.", 'error');
      // Revert UI Update
      setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, status: user.status } : p));
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      addToast('E-mail de recuperação de senha enviado com sucesso.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Erro ao enviar e-mail: ${err.message}`, 'error');
    }
  };

  const handleCurationAction = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('unknown_concepts_queue')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setUnknownConcepts(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      addToast(`Conceito ${newStatus === 'approved' ? 'Aprovado' : 'Rejeitado'} com sucesso.`, 'success');
    } catch (err: any) {
      console.error('Erro na curadoria:', err);
      addToast('Erro ao atualizar status do conceito.', 'error');
    }
  };

  // Filtragem
  const filteredLogs = logs.filter(log => 
    !searchTerm || 
    log.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.ipAddress?.includes(searchTerm) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogins = loginAttempts.filter(attempt => 
    !searchTerm || 
    attempt.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attempt.ip_address?.includes(searchTerm)
  );

  const filteredProfiles = profiles.filter(profile => 
    !searchTerm || 
    profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.id?.includes(searchTerm)
  );

  const filteredConcepts = unknownConcepts.filter(concept =>
    !searchTerm ||
    concept.term?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    concept.context?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto bg-canvas text-on-surface p-6 md:p-8 animate-fadeIn">
      {/* Header Seco e Profissional */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Server className="w-6 h-6 text-primary" />
              Noc Mentis
            </h1>
          </div>
        </div>

        {/* Barra de Pesquisa Global */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-foreground-muted" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl leading-5 bg-surface text-on-surface placeholder-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
            placeholder="Buscar por Email, IP ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <XCircle className="h-4 w-4 text-foreground-muted hover:text-on-surface" />
            </button>
          )}
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex space-x-1 border-b border-border mb-8">
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'monitoring' 
            ? 'border-primary text-primary' 
            : 'border-transparent text-foreground-muted hover:text-on-surface hover:border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" /> Monitoramento
          </div>
        </button>
        <button
          onClick={() => setActiveTab('ai_telemetry')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'ai_telemetry' 
            ? 'border-primary text-primary' 
            : 'border-transparent text-foreground-muted hover:text-on-surface hover:border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" /> Custos de IA
          </div>
        </button>
        <button
          onClick={() => setActiveTab('ai_inspector')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'ai_inspector' 
            ? 'border-primary text-primary' 
            : 'border-transparent text-foreground-muted hover:text-on-surface hover:border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" /> Auditoria IA
          </div>
        </button>
        <button
          onClick={() => setActiveTab('rag_inspector')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'rag_inspector' 
            ? 'border-primary text-primary' 
            : 'border-transparent text-foreground-muted hover:text-on-surface hover:border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            <SearchCode className="w-4 h-4" /> RAG Clínico
          </div>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users' 
            ? 'border-primary text-primary' 
            : 'border-transparent text-foreground-muted hover:text-on-surface hover:border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Gestão de Contas
          </div>
        </button>
        <button
          onClick={() => setActiveTab('curation')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'curation' 
            ? 'border-primary text-primary' 
            : 'border-transparent text-foreground-muted hover:text-on-surface hover:border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Curadoria Ontológica
          </div>
        </button>
        <button
          onClick={() => setActiveTab('rescue')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'rescue' 
            ? 'border-primary text-primary' 
            : 'border-transparent text-foreground-muted hover:text-on-surface hover:border-border'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" /> Resgate E2EE
          </div>
        </button>
      </div>

      {/* ABA: CUSTOS IA */}
      {activeTab === 'ai_telemetry' && (
        <TelemetryDashboard />
      )}

      {/* ABA: AUDITORIA IA */}
      {activeTab === 'ai_inspector' && (
        <AdminAiInspectorTab />
      )}

      {/* ABA: RAG CLÍNICO */}
      {activeTab === 'rag_inspector' && (
        <RagInspector />
      )}

      {/* ABA: MONITORAMENTO (Logs e Logins) */}
      {activeTab === 'monitoring' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Métricas Globais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Contas Ativas</p>
                  <h3 className="text-3xl font-bold mt-2 text-on-surface">{metrics.totalUsers}</h3>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Falhas de Login (24h)</p>
                  <h3 className="text-3xl font-bold mt-2 text-on-surface">
                    {loginAttempts.filter(a => !a.success && new Date(a.attempted_at) > new Date(Date.now() - 86400000)).length}
                  </h3>
                </div>
                <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Ações Hoje</p>
                  <h3 className="text-3xl font-bold mt-2 text-on-surface">
                    {logs.filter(l => new Date(l.timestamp) > new Date(new Date().setHours(0,0,0,0))).length}
                  </h3>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <ActivitySquare className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabelas de Dados */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* Painel 1: Força Bruta */}
            <div className="flex flex-col bg-surface border border-border rounded-xl shadow-sm overflow-hidden h-[600px]">
              <div className="px-5 py-4 border-b border-border bg-surface-container-low flex justify-between items-center shrink-0">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  Logs de Autenticação (Edge)
                </h2>
                <span className="text-xs text-foreground-muted font-medium">{filteredLogins.length} registros</span>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-foreground-muted text-sm">Buscando dados...</div>
                ) : filteredLogins.length === 0 ? (
                  <div className="p-8 text-center text-foreground-muted text-sm flex flex-col items-center gap-2">
                    <SearchX className="w-8 h-8 opacity-20" />
                    Nenhum registro encontrado.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container-low text-xs uppercase text-foreground-muted sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Data/Hora</th>
                        <th className="px-5 py-3 font-semibold">Identificação</th>
                        <th className="px-5 py-3 font-semibold">IP Address</th>
                        <th className="px-5 py-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredLogins.map((attempt) => (
                        <tr key={attempt.id} className="hover:bg-surface-container-low transition-colors group">
                          <td className="px-5 py-3 whitespace-nowrap text-foreground-muted text-xs">
                            {new Date(attempt.attempted_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="px-5 py-3 text-xs font-medium truncate max-w-[150px]" title={attempt.email}>
                            {attempt.email}
                          </td>
                          <td className="px-5 py-3 font-mono text-[10px] text-foreground-muted">
                            {attempt.ip_address}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {attempt.success ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                SUCESSO
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                FALHA
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Painel 2: Auditoria Global */}
            <div className="flex flex-col bg-surface border border-border rounded-xl shadow-sm overflow-hidden h-[600px]">
              <div className="px-5 py-4 border-b border-border bg-surface-container-low flex justify-between items-center shrink-0">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Auditoria de Banco de Dados
                </h2>
                <span className="text-xs text-foreground-muted font-medium">Últimos {filteredLogs.length} eventos</span>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-foreground-muted text-sm">Buscando dados...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-foreground-muted text-sm flex flex-col items-center gap-2">
                    <SearchX className="w-8 h-8 opacity-20" />
                    Nenhum registro encontrado.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container-low text-xs uppercase text-foreground-muted sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Ação / Recurso</th>
                        <th className="px-5 py-3 font-semibold">Ator (ID)</th>
                        <th className="px-5 py-3 font-semibold text-right">Data/Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-5 py-3">
                            <span className="font-semibold text-xs tracking-wide">{log.action}</span>
                            {log.resource && (
                              <div className="text-[10px] text-foreground-muted mt-0.5 capitalize">
                                Ref: {log.resource}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="font-mono text-[10px] text-foreground-muted bg-surface-container-low px-1.5 py-0.5 rounded border border-border inline-block">
                              {log.userId?.split('-')[0]}
                            </div>
                            <div className="text-[10px] text-foreground-muted mt-0.5">IP: {log.ipAddress}</div>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-right text-xs text-foreground-muted">
                            {new Date(log.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ABA: GESTÃO DE USUÁRIOS */}
      {activeTab === 'users' && (
        <div className="flex flex-col bg-surface border border-border rounded-xl shadow-sm overflow-hidden min-h-[500px] animate-fadeIn">
          <div className="px-5 py-4 border-b border-border bg-surface-container-low flex justify-between items-center shrink-0">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              Contas da Plataforma (Power Users)
            </h2>
            <span className="text-xs text-foreground-muted font-medium">{filteredProfiles.length} contas</span>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-foreground-muted text-sm">Buscando perfis...</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="p-8 text-center text-foreground-muted text-sm flex flex-col items-center gap-2">
                <SearchX className="w-8 h-8 opacity-20" />
                Nenhum usuário encontrado.
              </div>
            ) : (
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-surface-container-low text-xs uppercase text-foreground-muted shadow-sm">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Usuário / Email</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Atividade Recente</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProfiles.map((profile) => {
                    const isBlocked = profile.status === 'blocked';
                    // Calcular métrica de atividade baseada nos logs retornados (Amostragem simples)
                    const activityCount = logs.filter(l => l.userId === profile.id).length;
                    
                    return (
                      <tr key={profile.id} className={`hover:bg-surface-container-low transition-colors ${isBlocked ? 'opacity-60 bg-red-500/5' : ''}`}>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-sm text-on-surface">{profile.name}</div>
                          <div className="text-xs text-foreground-muted mt-0.5">{profile.email}</div>
                          <div className="font-mono text-[9px] text-foreground-muted mt-1 opacity-50">{profile.id}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            profile.role === 'admin' 
                            ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' 
                            : 'bg-surface-container text-foreground-muted border-border'
                          }`}>
                            {profile.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {activityCount > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${Math.min(activityCount * 5, 100)}%` }} />
                              </div>
                              <span className="text-xs text-foreground-muted">{activityCount} logs</span>
                            </div>
                          ) : (
                            <span className="text-xs text-foreground-muted italic">Inativo recentemente</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                              <Ban className="w-3 h-3" /> BLOQUEADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <CheckCircle className="w-3 h-3" /> ATIVO
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResetPassword(profile.email)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-foreground-muted hover:text-on-surface transition-colors"
                              title="Enviar link de redefinição de senha"
                            >
                              <Key className="w-3.5 h-3.5" /> Resetar Senha
                            </button>
                            <button
                              onClick={() => handleToggleStatus(profile)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                isBlocked 
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                                : 'bg-red-500/10 hover:bg-red-500/20 text-red-600'
                              }`}
                            >
                              {isBlocked ? (
                                <><UserCheck className="w-3.5 h-3.5" /> Desbloquear</>
                              ) : (
                                <><Ban className="w-3.5 h-3.5" /> Suspender</>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ABA: CURADORIA ONTOLÓGICA (Staging Backlog) */}
      {activeTab === 'curation' && (
        <div className="flex flex-col bg-surface border border-border rounded-xl shadow-sm overflow-hidden min-h-[500px] animate-fadeIn">
          <div className="px-5 py-4 border-b border-border bg-surface-container-low flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Curadoria de Conceitos (Backlog Staging)
              </h2>
              <p className="text-xs text-foreground-muted mt-1">
                Conceitos extraídos que falharam no Confidence Gate. Aprová-los mudará o status no banco para a próxima release da engenharia.
              </p>
            </div>
            <span className="text-xs text-foreground-muted font-medium">{filteredConcepts.length} pendências</span>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-foreground-muted text-sm">Buscando conceitos...</div>
            ) : filteredConcepts.length === 0 ? (
              <div className="p-8 text-center text-foreground-muted text-sm flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 opacity-20 text-emerald-500" />
                Fila de curadoria limpa! Todos os conceitos foram processados.
              </div>
            ) : (
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-surface-container-low text-xs uppercase text-foreground-muted shadow-sm">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Conceito Desconhecido</th>
                    <th className="px-5 py-3 font-semibold w-1/3">Contexto Original</th>
                    <th className="px-5 py-3 font-semibold text-center">Status</th>
                    <th className="px-5 py-3 font-semibold text-right">Julgamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredConcepts.map((concept) => (
                    <tr key={concept.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-sm bg-indigo-50 text-indigo-700 px-2 py-1 rounded inline-block">
                          {concept.term}
                        </div>
                        <div className="text-[10px] text-foreground-muted mt-2 font-mono">
                          ID: {concept.id}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-foreground-muted italic bg-surface-container p-2 rounded border border-border">
                          "{concept.context}"
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {concept.status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            PENDENTE
                          </span>
                        )}
                        {concept.status === 'approved' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            APROVADO
                          </span>
                        )}
                        {concept.status === 'rejected' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                            REJEITADO
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {concept.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleCurationAction(concept.id, 'approved')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" /> Aprovar
                            </button>
                            <button
                              onClick={() => handleCurationAction(concept.id, 'rejected')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container hover:bg-red-500/10 text-foreground-muted hover:text-red-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" /> Descartar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-foreground-muted">
                            Julgado em {new Date(concept.updated_at || concept.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ABA: RESGATE E2EE */}
      {activeTab === 'rescue' && (
        <div className="space-y-6">
          <RescueAccountPanel />
        </div>
      )}

    </div>
  );
};

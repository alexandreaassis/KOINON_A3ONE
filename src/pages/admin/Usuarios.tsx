import React, { useState, useEffect } from 'react'
import { api, type UserRecord, type UserRole, type UnidadeRecord } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useCondoConfig } from '@/context/CondoConfigContext'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  CheckCircle2,
  XCircle,
  Search,
  Lock,
} from 'lucide-react'

export const GestaoUsuariosPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const { rotuloUnidade } = useCondoConfig()
  const [usuarios, setUsuarios] = useState<UserRecord[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  // Modal Criar/Editar Usuário
  const [modalUsuarioAberto, setModalUsuarioAberto] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState<UserRole>('morador')
  const [unidadeId, setUnidadeId] = useState<string>('none')
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Modal Reset de Senha
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)
  const [usuarioResetSenha, setUsuarioResetSenha] = useState<UserRecord | null>(null)
  const [novaSenha, setNovaSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const carregar = async () => {
    setCarregando(true)
    try {
      const [users, unds] = await Promise.all([api.getUsuarios(), api.getUnidades()])
      setUsuarios(users)
      setUnidades(unds)
    } catch (err) {
      console.error('Erro ao carregar usuários:', err)
      toast({
        title: 'Erro ao carregar usuários',
        description: 'Verifique suas permissões de administrador.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const abrirNovoUsuario = () => {
    setEditId(null)
    setNome('')
    setEmail('')
    setSenha('Skip@Pass')
    setRole('morador')
    setUnidadeId('none')
    setAtivo(true)
    setModalUsuarioAberto(true)
  }

  const abrirEditarUsuario = (u: UserRecord) => {
    setEditId(u.id)
    setNome(u.name || '')
    setEmail(u.email || '')
    setSenha('') // não edita senha aqui
    setRole(u.role || 'morador')
    setUnidadeId(u.unidade || 'none')
    setAtivo(u.ativo !== false)
    setModalUsuarioAberto(true)
  }

  const handleSalvarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      if (editId) {
        await api.updateUsuario(editId, {
          name: nome.trim(),
          role: role,
          unidade: unidadeId === 'none' ? '' : unidadeId,
          ativo: ativo,
        })

        await api.registrarEventoAuditoria({
          evento: 'autenticacao_concluida',
          fator: `Admin ${currentUser?.name} atualizou dados do usuário ${email} (Papel: ${role}, Ativo: ${ativo})`,
        })

        toast({ title: 'Usuário atualizado com sucesso' })
      } else {
        await api.createUsuario({
          name: nome.trim(),
          email: email.trim(),
          password: senha || 'Skip@Pass',
          passwordConfirm: senha || 'Skip@Pass',
          role: role,
          unidade: unidadeId === 'none' ? '' : unidadeId,
          ativo: ativo,
          verified: true,
        })

        await api.registrarEventoAuditoria({
          evento: 'autenticacao_concluida',
          fator: `Admin ${currentUser?.name} cadastrou novo usuário ${email} (Papel: ${role})`,
        })

        toast({ title: 'Usuário cadastrado com sucesso' })
      }
      setModalUsuarioAberto(false)
      carregar()
    } catch (err: any) {
      console.error('Erro ao salvar usuário:', err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Falha ao persistir usuário.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleAlternarStatusAtivo = async (u: UserRecord) => {
    const novoStatus = !(u.ativo !== false)
    try {
      await api.updateUsuario(u.id, { ativo: novoStatus })
      await api.registrarEventoAuditoria({
        evento: 'autenticacao_concluida',
        fator: `Admin ${currentUser?.name} alterou status de ${u.email} para ${novoStatus ? 'ATIVO' : 'INATIVO'}`,
      })
      toast({
        title: novoStatus ? 'Usuário Ativado' : 'Usuário Desativado',
      })
      carregar()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status',
        description: err?.message,
        variant: 'destructive',
      })
    }
  }

  const handleResetarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioResetSenha || !novaSenha) return

    setSalvandoSenha(true)
    try {
      await api.updateUsuario(usuarioResetSenha.id, {
        password: novaSenha,
        passwordConfirm: novaSenha,
      })

      await api.registrarEventoAuditoria({
        evento: 'autenticacao_concluida',
        fator: `Admin ${currentUser?.name} realizou reset manual de senha para ${usuarioResetSenha.email}`,
      })

      toast({
        title: 'Senha Redefinida',
        description: `A nova senha de ${usuarioResetSenha.name || usuarioResetSenha.email} foi gravada com sucesso.`,
      })
      setModalSenhaAberto(false)
      setNovaSenha('')
      setUsuarioResetSenha(null)
    } catch (err: any) {
      toast({
        title: 'Erro no Reset de Senha',
        description: err?.message || 'Não foi possível redefinir a senha.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoSenha(false)
    }
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    const termo = busca.toLowerCase()
    return (
      (u.name || '').toLowerCase().includes(termo) ||
      (u.email || '').toLowerCase().includes(termo) ||
      (u.role || '').toLowerCase().includes(termo)
    )
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-700" /> Gestão de Usuários e Permissões
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Controle de acessos, papéis de mesa/administrador, vinculação de apartamentos e reset de
            senhas.
          </p>
        </div>

        <Button
          size="sm"
          onClick={abrirNovoUsuario}
          className="bg-purple-700 hover:bg-purple-800 text-white text-xs self-start sm:self-center"
        >
          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Novo Usuário
        </Button>
      </div>

      {/* Barra de Pesquisa e Filtro */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, e-mail ou papel..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9 text-xs border-slate-300"
          />
        </div>
      </div>

      {/* Lista de Usuários */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900">
            Usuários Registrados ({usuariosFiltrados.length})
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Cada condômino ou operador de assembleia possui credenciais individuais auditadas.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Usuário / Nome</th>
                  <th className="py-2.5 px-4">E-mail</th>
                  <th className="py-2.5 px-4">Papel</th>
                  <th className="py-2.5 px-4">Unidade Vinculada</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuariosFiltrados.map((u) => {
                  const unidadeVinc = unidades.find((item) => item.id === u.unidade)
                  const isAtivo = u.ativo !== false

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{u.name || '—'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {u.id}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700">{u.email}</td>

                      <td className="py-3 px-4">
                        <Badge
                          className={`text-[10px] uppercase font-bold tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-purple-700 text-white'
                              : u.role === 'mesa'
                                ? 'bg-amber-600 text-white'
                                : 'bg-cyan-700 text-white'
                          }`}
                        >
                          {u.role || 'morador'}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {unidadeVinc ? (
                          <span className="font-mono text-xs">
                            {unidadeVinc.tipo_unidade || rotuloUnidade} {unidadeVinc.identificador}{' '}
                            ({unidadeVinc.bloco})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Nenhum vínculo</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleAlternarStatusAtivo(u)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                            isAtivo
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                          title="Clique para alternar status ativo/inativo"
                        >
                          {isAtivo ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Ativo
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" /> Inativo
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2 border-slate-300"
                            onClick={() => abrirEditarUsuario(u)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-2 text-slate-600 hover:text-purple-700"
                            title="Resetar senha"
                            onClick={() => {
                              setUsuarioResetSenha(u)
                              setNovaSenha('Skip@Pass')
                              setModalSenhaAberto(true)
                            }}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Criar/Editar Usuário */}
      <Dialog open={modalUsuarioAberto} onOpenChange={setModalUsuarioAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editId ? 'Editar Usuário' : 'Novo Usuário do Condomínio'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Configure as credenciais e nível de autoridade no sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarUsuario} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome Completo</Label>
              <Input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Alexandre Silva"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">E-mail</Label>
              <Input
                type="email"
                required
                disabled={!!editId}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@lagoazul.com.br"
                className="text-xs h-9"
              />
            </div>

            {!editId && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Senha Inicial</Label>
                <Input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres (Ex: Skip@Pass)"
                  className="text-xs h-9"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Papel / Nível</Label>
                <Select value={role} onValueChange={(val: UserRole) => setRole(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morador">Morador (Votante)</SelectItem>
                    <SelectItem value="mesa">Mesa Diretora</SelectItem>
                    <SelectItem value="admin">Administrador Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Unidade Vinculada</Label>
                <Select value={unidadeId} onValueChange={setUnidadeId}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="none">Nenhuma unidade</SelectItem>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.tipo_unidade || rotuloUnidade} {u.identificador} (
                        {u.bloco || 'Lago Azul'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                <p className="font-semibold text-slate-800 text-xs">Usuário Ativo</p>
                <p className="text-[10px] text-slate-500">
                  Desative para bloquear imediatamente o acesso à assembleia.
                </p>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalUsuarioAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                size="sm"
                className="bg-purple-700 hover:bg-purple-800 text-white font-semibold"
              >
                {salvando ? 'Salvando...' : 'Salvar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Reset de Senha */}
      <Dialog open={modalSenhaAberto} onOpenChange={setModalSenhaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-purple-700" /> Redefinir Senha do Usuário
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Defina uma nova senha de acesso para{' '}
              <strong>{usuarioResetSenha?.name || usuarioResetSenha?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetarSenha} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nova Senha</Label>
              <Input
                type="text"
                required
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Ex: Skip@Pass"
                className="text-xs h-9 font-mono"
              />
              <span className="text-[10px] text-slate-400">
                Mínimo de 8 caracteres. O usuário poderá alterar em seguida.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalSenhaAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoSenha || novaSenha.length < 8}
                size="sm"
                className="bg-purple-700 hover:bg-purple-800 text-white font-semibold"
              >
                {salvandoSenha ? 'Redefinindo...' : 'Confirmar Nova Senha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default GestaoUsuariosPage

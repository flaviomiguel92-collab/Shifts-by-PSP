# CHANGELOG_AUDIT.md — Auditoria e Correções

> **Data:** 2026-05-16  
> **Autor:** Claude (Agente de Auditoria)  
> **Propósito:** Documentar todas as alterações feitas durante a auditoria para verificação futura por outro agente.

---

## Índice

1. [Problemas de UI — Fundo Branco nos Inputs](#1-fundo-branco-nos-inputs)
2. [Problemas de UI — Donut Chart Ilegível](#2-donut-chart-ilegível)
3. [Vulnerabilidades de Segurança — IDOR](#3-idor-insecure-direct-object-reference)
4. [Vulnerabilidades de Segurança — Bulk Shifts](#4-bulk-shifts-idor)
5. [Ficheiros Modificados](#5-ficheiros-modificados)

---

## 1. Fundo Branco nos Inputs

### Problema
Em ambiente web (React Native Web), os elementos `<TextInput>` renderizam como `<input>` HTML nativo, que herda o fundo branco do browser (`background-color: white`). Embora as Views wrapper tivessem fundo escuro (`rgba(5, 8, 22, 0.6)`), o `<input>` HTML ignora o fundo do elemento pai e mostra fundo branco.

### Solução Aplicada
Adicionar `backgroundColor: 'transparent'` diretamente no estilo do `TextInput` em todos os ficheiros que usam inputs.

### Ficheiros Corrigidos

| # | Ficheiro | Linha Alterada | Código Original | Código Novo |
|---|----------|----------------|-----------------|-------------|
| 1 | `frontend/src/components/ui/Input.tsx` | style `.input` | `color: COLORS.textPrimary, fontSize: 14` | `+ backgroundColor: 'transparent'` |
| 2 | `frontend/app/login.tsx` | style `.input` | `color: '#F1F5F9', fontSize: 15` | `+ backgroundColor: 'transparent'` |
| 3 | `frontend/app/register.tsx` | style `.input` | `color: '#F1F5F9', fontSize: 15` | `+ backgroundColor: 'transparent'` |
| 4 | `frontend/app/(tabs)/gratificados.tsx` | style `.searchInput` | `color: '#F1F5F9', fontSize: 13, padding: 0` | `+ backgroundColor: 'transparent'` |
| 5 | `frontend/src/components/occurrence/PersonFormModal.tsx` | style `.input` | `backgroundColor: 'rgba(5,8,22,0.6)'` | `backgroundColor: 'transparent'` |
| 6 | `frontend/src/components/occurrence/CreateOccurrenceModal.tsx` | style `.input` | `backgroundColor: 'rgba(5,8,22,0.6)'` | `backgroundColor: 'transparent'` |
| 7 | `frontend/src/components/GratifiedModal.tsx` | style `.input` | `backgroundColor: '#111827'` | `backgroundColor: 'transparent'` |
| 8 | `frontend/src/components/ShiftModal.tsx` | style `.input` | `color: '#F1F5F9', fontSize: 14` | `+ backgroundColor: 'transparent'` |

**Nota:** O ficheiro `frontend/app/(tabs)/ocorrencias.tsx` não tem inputs diretos — eles estão nos modais `PersonFormModal` e `CreateOccurrenceModal` que já foram corrigidos.

---

## 2. Donut Chart Ilegível

### Problema
Em `frontend/app/(tabs)/stats.tsx`, o componente `PieChart` com `donut` mostrava o texto central (número de turnos + label "turnos") diretamente sobre as fatias coloridas do gráfico. Fatias de cores claras (ex: verde `#22C55E`, laranja `#F59E0B`) faziam o texto perder contraste, tornando-o ilegível.

### Solução Aplicada
Adicionar um círculo escuro (`rgba(5, 8, 22, 0.85)`) atrás do texto central com `borderRadius: 30`, `width: 60`, `height: 60`. O texto foi alterado para branco puro (`#FFFFFF`) no número e `#94A3B8` na label.

### Código Modificado
```tsx
// ANTES (stats.tsx linha ~311):
centerLabelComponent={() => (
  <View style={styles.donutCenter}>
    <Text style={styles.donutCenterValue}>{monthShifts.length}</Text>
    <Text style={styles.donutCenterLabel}>turnos</Text>
  </View>
)}

// DEPOIS:
centerLabelComponent={() => (
  <View style={styles.donutCenter}>
    <View style={{
      backgroundColor: 'rgba(5, 8, 22, 0.85)',
      borderRadius: 30,
      width: 60,
      height: 60,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Text style={[styles.donutCenterValue, { color: '#FFFFFF', lineHeight: 22 }]}>{monthShifts.length}</Text>
      <Text style={[styles.donutCenterLabel, { color: '#94A3B8' }]}>turnos</Text>
    </View>
  </View>
)}
```

---

## 3. IDOR (Insecure Direct Object Reference)

### Problema
Três endpoints no backend (`backend/server.py`) faziam updates no MongoDB filtrando **apenas pelo ID do documento**, sem verificar o `user_id`. Isto permitia que um utilizador autenticado modificasse dados de outro utilizador se soubesse (ou adivinhasse) o ID do documento.

### 3.1 — PUT /shifts/{shift_id} (linha ~578)

**Antes** (vulnerável):
```python
await db.shifts.update_one({"id": shift_id}, {"$set": update_data})
```

**Depois** (corrigido):
```python
await db.shifts.update_one({"id": shift_id, "user_id": user.user_id}, {"$set": update_data})
```

### 3.2 — POST /shifts/bulk (linha ~534)

**Antes** (vulnerável):
```python
await db.shifts.update_one({"id": existing["id"]}, {"$set": update_fields})
```

**Depois** (corrigido):
```python
await db.shifts.update_one({"id": existing["id"], "user_id": user.user_id}, {"$set": update_fields})
```

### 3.3 — PUT /gratifications/{grat_id} (linha ~649)

**Antes** (vulnerável):
```python
await db.gratifications.update_one(
    {"id": grat_id},
    {"$set": update_data}
)
```

**Depois** (corrigido):
```python
await db.gratifications.update_one(
    {"id": grat_id, "user_id": user.user_id},
    {"$set": update_data}
)
```

### Notas de Verificação
- Os endpoints de DELETE já tinham o filtro `user_id` correto
- Os endpoints de GET já filtravam por `user_id`
- As mutations de criação já associavam o `user_id` do utilizador autenticado
- Apenas os 3 endpoints de UPDATE estavam vulneráveis

---

## 4. Bulk Shifts IDOR

### Problema Adicional
O mesmo problema do IDOR existia no `POST /shifts/bulk` onde o update era feito apenas por `id` sem verificar o dono.

### Ficheiro
`backend/server.py` linha ~534

### Código Modificado
```python
# Antes
await db.shifts.update_one({"id": existing["id"]}, {"$set": update_fields})

# Depois
await db.shifts.update_one({"id": existing["id"], "user_id": user.user_id}, {"$set": update_fields})
```

### Nota
Foi também corrigida a indentação que ficou incorreta durante a modificação (linhas 535-537 estavam com indentação errada, causando erro de sintaxe).

---

## 5. Ficheiros Modificados

### Frontend (8 ficheiros)

| Ficheiro | Alterações | Risco |
|----------|------------|-------|
| `frontend/src/components/ui/Input.tsx` | +`backgroundColor: 'transparent'` | Baixo |
| `frontend/app/login.tsx` | +`backgroundColor: 'transparent'` | Baixo |
| `frontend/app/register.tsx` | +`backgroundColor: 'transparent'` | Baixo |
| `frontend/app/(tabs)/gratificados.tsx` | +`backgroundColor: 'transparent'` | Baixo |
| `frontend/src/components/occurrence/PersonFormModal.tsx` | `backgroundColor` alterado | Baixo |
| `frontend/src/components/occurrence/CreateOccurrenceModal.tsx` | `backgroundColor` alterado | Baixo |
| `frontend/src/components/GratifiedModal.tsx` | `backgroundColor` alterado | Baixo |
| `frontend/src/components/ShiftModal.tsx` | +`backgroundColor: 'transparent'` | Baixo |
| `frontend/app/(tabs)/stats.tsx` | Donut center label com fundo escuro | Baixo |

### Backend (1 ficheiro)

| Ficheiro | Alterações | Risco |
|----------|------------|-------|
| `backend/server.py` | 3x adicionado `user_id` a filtros MongoDB + indentação | **Médio** (testar) |

---

## Instruções para Verificação

### Verificar Inputs
1. Abrir a app em ambiente web
2. Navegar por login, register, gratificados, ocorrências (criar/editar)
3. Confirmar que todos os inputs têm fundo escuro, não branco

### Verificar Donut Chart
1. Ir à página de Stats/Painel
2. Confirmar que o número de turnos no centro do donut está legível
3. O centro deve ter um círculo escuro com texto branco

### Verificar Segurança
1. O código Python deve ser revisto para confirmar que `user_id` está presente em todos os filtros de update
2. Testar com dois utilizadores: tentar modificar shifts/ocorrências do outro
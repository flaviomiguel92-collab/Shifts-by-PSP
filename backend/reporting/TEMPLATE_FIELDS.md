# Template mapping - Relatório de Serviço Remunerado

Placeholders Jinja2 compatíveis com `docxtpl` que devem estar presentes no template Word.

## Campos simples - Cabeçalho

- `{{ servico_remunerado }}` - Nome do serviço remunerado
- `{{ report_date }}` - Data do relatório (formatada DD/MM/YYYY)
- `{{ report_hour }}` - Hora do relatório (HH:MM)

## Campos simples - Efetivo Policial (Contadores)

- `{{ efetivo_oficiais }}` - Número total de oficiais
- `{{ efetivo_chefes }}` - Número total de chefes
- `{{ efetivo_agentes }}` - Número total de agentes

## Campos simples - Polícia Mais Graduado/Antigo

- `{{ graduado_nome }}` - Nome da pessoa mais antiga
- `{{ graduado_categoria }}` - Categoria (Agente, Chefe, Oficial)
- `{{ graduado_matricula }}` - Matrícula (com prefixo M/)
- `{{ graduado_radio }}` - Número do rádio (E/R)

## Campos simples - Ordem de Missão e Observações

- `{{ ordem_missao_cumprida }}` - "Sim", "Não" ou "Não respondido"
- `{{ justificacao }}` - Justificação em caso de não cumprimento
- `{{ observacao }}` - Observações adicionais
- `{{ generated_at }}` - Data/hora de geração (DD/MM/YYYY HH:MM:SS)

## Lista repetível - Demais Efetivo Policial

Dentro da linha de tabela repetível:

```jinja2
{% for item in demais_efetivo %}
{{ item.matricula }} | {{ item.categoria }} | {{ item.nome }}
{% endfor %}
```

## Lista repetível - Expediente Efetuado

Dentro da linha de tabela repetível:

```jinja2
{% for item in expediente_efetuado %}
{{ item.npp }} | {{ item.nuipc }} | {{ item.tipificacao }}
{% endfor %}
```

## Nota

- **ORV (Responsáveis Contactados)**: Removido do escopo (não será preenchido)
- Template foi atualizado automaticamente: placeholders antigos foram corrigidos
- Novos campos (`servico_remunerado`, `graduado_radio`, `ordem_missao_cumprida`) precisam ser adicionados manualmente ao template Word se não estiverem presentes

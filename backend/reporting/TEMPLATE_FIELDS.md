# Template mapping - Relatório de Serviço Remunerado

Para automação robusta do `.docx`, o template Word deve usar placeholders Jinja2 compatíveis com `docxtpl`.

## Campos simples

- `{{ report_date }}`
- `{{ report_hour }}`
- `{{ remunerated_name }}`
- `{{ service_type }}`
- `{{ service_location }}`
- `{{ service_reference }}`
- `{{ efetivo_total }}`
- `{{ chefes_count }}`
- `{{ agentes_count }}`
- `{{ graduado_posto }}`
- `{{ graduado_nome }}`
- `{{ graduado_matricula }}`
- `{{ graduado_comando }}`
- `{{ observacoes }}`
- `{{ justificacoes }}`

## Lista repetível - Demais efetivo policial

Dentro da linha de tabela repetível:

```jinja2
{% for item in demais_efetivo %}
{{ item.posto }} | {{ item.nome }} | {{ item.matricula }}
{% endfor %}
```

## Lista repetível - Expediente efetuado

Dentro da linha de tabela repetível:

```jinja2
{% for item in expediente_efetuado %}
{{ item.descricao }} | {{ item.referencia }}
{% endfor %}
```

## Nota

- ORV fica fora de escopo nesta fase.
- Se o template atual não tiver placeholders técnicos, basta inserir estes tokens nas células amarelas correspondentes.

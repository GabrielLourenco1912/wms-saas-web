#!/usr/bin/env python3
"""Generate publishable documentation snapshots; never needed during build/runtime."""
from pathlib import Path
from html.parser import HTMLParser
from zipfile import ZipFile
import hashlib, json, subprocess, sys
import xml.etree.ElementTree as ET

WEB = Path(__file__).resolve().parents[1]
ROOT = WEB.parent
CHECK = '--check' in sys.argv

class SchemaParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.active = False; self.chunks = []
    def handle_starttag(self, tag, attrs):
        if tag == 'script' and dict(attrs).get('id') == 'schema': self.active = True
    def handle_endtag(self, tag):
        if tag == 'script': self.active = False
    def handle_data(self, data):
        if self.active: self.chunks.append(data)

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def value(node, key, default=''):
    found = node.find(f"value[@key='{key}']")
    return found.text if found is not None and found.text is not None else default

def write(path, data):
    if isinstance(data, str): data = data.encode()
    if CHECK:
        if not path.exists() or path.read_bytes() != data: raise ValueError(f'Snapshot desatualizado: {path.relative_to(WEB)}. Execute npm run docs:sync.')
    else:
        path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(data)

def revision(path):
    return subprocess.check_output(['git','-C',str(path),'rev-parse','--short','HEAD'],text=True).strip()

try:
    documents = []
    for identifier, title, path, download in [
        ('api','Referência da API',ROOT/'wms-saas-backend/docs/API_CLIENTS.md','api-reference.md'),
        ('web','Consumo no web',WEB/'docs/INTEGRACAO_API.md','integracao-web.md'),
        ('mobile','Consumo no mobile',ROOT/'wms_saas_mobile/docs/INTEGRACAO_API.md','integracao-mobile.md'),
    ]:
        documents.append(dict(id=identifier,title=title,markdown=path.read_text(),sha256=digest(path),download='/documentacao/'+download))
        write(WEB/'public/documentacao'/download,path.read_bytes())
    write(WEB/'src/features/documentation/content/api-documents.json',json.dumps({'backendRevision':revision(ROOT/'wms-saas-backend'),'documents':documents},ensure_ascii=False,indent=2)+'\n')
    html_path=ROOT/'docs-gerais/Modelo_Relacional_WMS_v2.html'
    mwb_path=ROOT/'docs-gerais/modelo_relacional_wms.mwb'
    png_path=ROOT/'docs-gerais/modelo_relacional_WMS_V2.png'
    parser=SchemaParser(); parser.feed(html_path.read_text())
    model=json.loads(''.join(parser.chunks))
    with ZipFile(mwb_path) as archive: xml=ET.fromstring(archive.read('document.mwb.xml'))
    tables=xml.findall(".//value[@struct-name='db.mysql.Table']")
    table_names={t.get('id'):value(t,'name') for t in tables}
    columns_by_id={c.get('id'):value(c,'name') for t in tables for c in t.findall("value[@key='columns']/value")}
    old_relations={(r['child'],r['field'],r['parent']):r for r in model['relationships']}
    relationships=[]
    for table in tables:
        name=value(table,'name'); semantic=model['tables'][name]
        old_fields={f['name']:f for f in semantic['fields']}
        indices=[]
        for index in table.findall("value[@key='indices']/value"):
            fields=[columns_by_id[c.text] for c in index.findall("value[@key='columns']/value/link[@key='referencedColumn']")]
            indices.append(dict(fields=fields,primary=value(index,'isPrimary')=='1',unique=value(index,'unique')=='1'))
        foreign={}
        for key in table.findall("value[@key='foreignKeys']/value"):
            parent=table_names[key.find("link[@key='referencedTable']").text]
            child_fields=[columns_by_id[c.text] for c in key.findall("value[@key='columns']/link")]
            parent_fields=[columns_by_id[c.text] for c in key.findall("value[@key='referencedColumns']/link")]
            unique=any(i['fields'] and set(i['fields'])==set(child_fields) and (i['unique'] or i['primary']) for i in indices)
            for field, ref_field in zip(child_fields,parent_fields):
                old=old_relations.get((name,field,parent),{})
                col=next(c for c in table.findall("value[@key='columns']/value") if value(c,'name')==field)
                foreign[field]=(parent,ref_field)
                relationships.append(dict(child=name,parent=parent,field=field,parentField=ref_field,optional=value(col,'isNotNull')!='1',unique=unique,essential=bool(old.get('essential'))))
        fields=[]
        for column in table.findall("value[@key='columns']/value"):
            field=value(column,'name'); old=old_fields.get(field,{})
            simple=column.find("link[@key='simpleType']")
            kind=simple.text.rsplit('.',1)[-1].upper() if simple is not None else 'TYPE'
            length=int(value(column,'length','-1')); precision=int(value(column,'precision','-1')); scale=int(value(column,'scale','-1'))
            if kind in ['CHAR','VARCHAR','BINARY','VARBINARY'] and length>0: kind+=f'({length})'
            elif kind in ['DECIMAL','NUMERIC'] and precision>=0: kind+=f'({precision},{max(scale,0)})'
            elif kind in ['DATETIME','TIMESTAMP','TIME'] and length>0: kind+=f'({length})'
            if 'UNSIGNED' in [flag.text for flag in column.findall("value[@key='flags']/value")]: kind+=' UNSIGNED'
            ref=foreign.get(field)
            fields.append(dict(name=field,type=kind,nullable=value(column,'isNotNull')!='1',pk=any(i['primary'] and field in i['fields'] for i in indices),unique=any(i['unique'] and i['fields']==[field] for i in indices),ref=ref[0] if ref else None,refField=ref[1] if ref else None,note=old.get('note','')))
        semantic['fields']=fields
    model['relationships']=relationships
    model['scope']='Modelo relacional aprovado no artigo: 29 tabelas de modelagem; o banco Flyway possui 30 tabelas físicas, incluindo acesso e sessão.'
    model['source']={'version':'V2','reviewedAt':'15/10/2026','htmlSha256':digest(html_path),'mwbSha256':digest(mwb_path),'pngSha256':digest(png_path)}
    assert len(model['tables'])==len(tables)==29
    assert sum(len(t['fields']) for t in model['tables'].values())==276
    assert len(relationships)==91
    write(WEB/'src/features/documentation/content/relational-model.json',json.dumps(model,ensure_ascii=False,indent=2)+'\n')
    write(WEB/'public/documentacao/modelo-relacional-wms-v2.png',png_path.read_bytes())
    print('Documentação pública '+('conferida' if CHECK else 'sincronizada')+': 3 guias, 29 tabelas, 276 campos, 91 relacionamentos e PNG aprovado.')
except (OSError,ValueError,KeyError,AssertionError) as error:
    print(f'Não foi possível sincronizar: {error}\nExecute na cópia completa de TCC_WMS, com backend, mobile e docs-gerais disponíveis. O build utiliza os snapshots já versionados.',file=sys.stderr)
    raise SystemExit(1)

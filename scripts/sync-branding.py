#!/usr/bin/env python3
"""Publica snapshots da identidade local. Build/runtime usam somente o web."""
import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

WEB = Path(__file__).resolve().parents[1]
SOURCE = WEB.parent / 'docs-gerais/identidade-visual'
CHECK = '--check' in sys.argv
FILES = []


def publish(source, target, transform=None):
    data = source.read_bytes()
    if transform:
        data = transform(data.decode()).encode()
    path = WEB / target
    if CHECK:
        if not path.is_file() or path.read_bytes() != data:
            raise ValueError(f'Snapshot desatualizado: {target}. Execute npm run branding:sync.')
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    FILES.append({'url': '/' + str(Path(target).relative_to('public')) if str(target).startswith('public/') else None,
                  'path': str(target), 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})


def write_snapshot(target, data):
    path = WEB / target
    if CHECK:
        if not path.is_file() or path.read_bytes() != data:
            raise ValueError(f'Snapshot desatualizado: {target}. Execute npm run branding:sync.')
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def write_json(target, value):
    write_snapshot(target, (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode())


def public_guide(content):
    content = content.replace('e o acompanhamento em [TASK_MASTER.md](TASK_MASTER.md)', 'e a versão interativa em [guia público](/documentacao/branding)')
    content = content.replace('As prévias dos e-mails estão em [emails/README.md](emails/README.md).', 'A aplicação nos e-mails está no [guia de e-mails](/branding/downloads/guia-aplicacao-emails.md).')
    links = {
        'index.html': '/documentacao/branding', 'icone.html': '/documentacao/branding#icone',
        'assinatura.html': '/documentacao/branding#autoria', 'tokens.json': '/branding/tokens.json',
        'icone/README.md': '/branding/downloads/guia-do-icone.md',
        'icone/wms-icon-assets.zip': '/branding/downloads/wms-icon-assets.zip',
        'assinatura/README.md': '/branding/downloads/guia-da-assinatura.md',
        '../../wms-saas-web/docs/IDENTIDADE_VISUAL.md': '/branding/downloads/guia-aplicacao-web.md',
        '../../wms_saas_mobile/docs/IDENTIDADE_VISUAL.md': '/branding/downloads/guia-aplicacao-mobile.md',
        '../../wms-saas-backend/docs/IDENTIDADE_EMAILS.md': '/branding/downloads/guia-aplicacao-emails.md',
    }
    for source, target in links.items():
        content = content.replace('](' + source + ')', '](' + target + ')')
    return content


try:
    tokens = json.loads((SOURCE / 'tokens.json').read_text())
    geometry = json.loads((SOURCE / 'icone/geometria.json').read_text())
    selection = json.loads((SOURCE / 'assinatura/selecao.json').read_text())
    for name in ['Manrope-Variable.ttf', 'DMMono-Regular.ttf', 'DMMono-Medium.ttf', 'Manrope-OFL.txt', 'DMMono-OFL.txt']:
        publish(SOURCE / 'assets' / name, f'public/branding/fonts/{name}')
    for svg in sorted((SOURCE / 'icone/svg').glob('*.svg')):
        for path in ET.fromstring(svg.read_bytes()).findall('.//{http://www.w3.org/2000/svg}path'):
            assert path.get('d') == geometry['path'], f'Geometria SVG desatualizada: {svg.name}'
        publish(svg, 'public/branding/symbols/' + svg.name)
    for name in ['favicon-16.png', 'favicon-32.png', 'favicon-48.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'favicon.ico', 'icons-manifest.json']:
        publish(SOURCE / 'icone/web' / name, f'public/branding/icons/{name}')
    publish(SOURCE / 'icone/png/app-icon-1024.png', 'public/branding/icons/app-icon-1024.png')
    publish(SOURCE / 'icone/web/favicon.ico', 'src/app/favicon.ico')
    publish(SOURCE / 'icone/svg/favicon.svg', 'src/app/icon.svg')
    publish(SOURCE / 'icone/web/apple-touch-icon.png', 'src/app/apple-icon.png')
    for entry in selection['files']:
        file = SOURCE / 'assinatura' / entry['path']
        assert hashlib.sha256(file.read_bytes()).hexdigest() == entry['sha256'], entry['path']
        target = 'public/branding/author/' + entry['path'].removeprefix('selecionada/')
        publish(file, target)
    for source, name in [
        ('icone/wms-icon-assets.zip', 'wms-icon-assets.zip'),
        ('assinatura/assinatura-wms.zip', 'author-signature.zip'),
        ('BRANDING.md', 'guia-de-marca.md'),
        ('icone/README.md', 'guia-do-icone.md'),
        ('assinatura/README.md', 'guia-da-assinatura.md'),
    ]:
        publish(SOURCE / source, 'public/branding/downloads/' + name, public_guide if source == 'BRANDING.md' else None)
    for origin, name in [
        (WEB / 'docs/IDENTIDADE_VISUAL.md', 'guia-aplicacao-web.md'),
        (WEB.parent / 'wms_saas_mobile/docs/IDENTIDADE_VISUAL.md', 'guia-aplicacao-mobile.md'),
        (WEB.parent / 'wms-saas-backend/docs/IDENTIDADE_EMAILS.md', 'guia-aplicacao-emails.md'),
    ]:
        publish(origin, 'public/branding/downloads/' + name)
    public_tokens = {key: tokens[key] for key in ['color', 'typography', 'spacing', 'radius', 'interaction']}
    public_tokens['metadata'] = {key: tokens['metadata'][key] for key in ['project', 'version', 'date', 'concept', 'tagline', 'descriptor']}
    public_tokens['assets'] = {
        'symbolLight': '/branding/symbols/symbol-green.svg', 'symbolDark': '/branding/symbols/symbol-lime.svg',
        'icon': '/branding/symbols/app-icon.svg', 'favicon': '/branding/icons/favicon.ico',
        'iconPackage': '/branding/downloads/wms-icon-assets.zip',
        'signatureLight': '/branding/author/signatures/01-monograma-gl-pt-light-mono.svg',
        'signatureDark': '/branding/author/signatures/01-monograma-gl-pt-dark-mono.svg',
    }
    write_json('public/branding/tokens.json', public_tokens)
    color = tokens['color']
    roles = {
        'background': color['background'], 'text': color['text']['primary'], 'muted': color['text']['secondary'],
        'surface': color['surface'], 'line': color['border']['subtle'], 'control': color['border']['control'],
        'ink': color['brand']['ink'], 'primary': color['brand']['primary'], 'primary-hover': color['brand']['primaryHover'],
        'accent': color['brand']['accent'], 'on-accent': color['brand']['onAccent'], 'on-primary': color['brand']['onPrimary'],
        'soft': color['brand']['soft'], 'inverse-text': color['text']['inverse'], 'inverse-muted': color['text']['inverseSecondary'],
    }
    for name, semantic in color['semantic'].items():
        roles[f'{name}-text'] = semantic['foreground']
        roles[f'{name}-background'] = semantic['background']
    assert all(re.fullmatch(r'#[0-9a-fA-F]{6}', value) for value in roles.values()), 'Cor inválida nos tokens'
    css = '/* Gerado por npm run branding:sync. */\n:root {\n' + ''.join(f'  --brand-{name}: {value};\n' for name, value in roles.items()) + '}\n'
    write_snapshot('src/features/branding/brand-tokens.css', css.encode())
    write_json('src/features/branding/content/geometry.json', geometry)
    write_json('src/features/branding/content/brand.json', {
        'metadata': public_tokens['metadata'], 'color': tokens['color'], 'typography': tokens['typography'],
        'spacing': tokens['spacing'], 'radius': tokens['radius'], 'interaction': tokens['interaction'],
        'author': {'name': selection['selected']['author'], 'signature': selection['selected']['name'],
                   'number': selection['selected']['number'], 'portfolio': selection['compactIcon']['portfolio'],
                   'source': selection['source'], 'files': selection['files']},
        'files': FILES,
    })
    print('Branding ' + ('conferido' if CHECK else 'sincronizado') + ': cores, fontes, símbolo, ícones, assinatura e downloads locais.')
except (OSError, ValueError, KeyError, AssertionError) as error:
    print(f'Não foi possível sincronizar o branding: {error}\nUse a cópia completa de TCC_WMS. O build utiliza os recursos já versionados no web.', file=sys.stderr)
    raise SystemExit(1)

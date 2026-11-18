"""Retrieve rule-specific official references without overwriting earlier evidence."""
import concurrent.futures
import datetime
import json
import pathlib
import re
import urllib.request

URLS = {
    'jp-tourism': 'https://www.cn.emb-japan.go.jp/itpr_zh/visa_dantai.html',
    'jp-jurisdiction': 'https://www.cn.emb-japan.go.jp/itpr_zh/consular.html',
    'jp-wh': 'https://www.mofa.go.jp/j_info/visit/w_holiday/index.html',
    'sg-exemption': 'https://www.ica.gov.sg/news-and-publications/newsroom/media-release/mutual-30-day-visa-exemption-arrangement-between-singapore-and-the-people-s-republic-of-china',
    'sg-arrival': 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore/sg-arrival-card',
    'sg-wh': 'https://www.mom.gov.sg/passes-and-permits/work-holiday-programme/eligibility',
    'sg-work': 'https://www.mom.gov.sg/passes-and-permits/employment-pass/eligibility',
    'uk-wh': 'https://www.gov.uk/youth-mobility/eligibility',
    'uk-tourism': 'https://www.gov.uk/standard-visitor/visit-on-business',
    'uk-evidence': 'https://www.gov.uk/government/publications/visitor-visa-guide-to-supporting-documents/guide-to-supporting-documents-visiting-the-uk',
    'uk-work': 'https://www.gov.uk/skilled-worker-visa/your-job',
    'nz-wh': 'https://www.immigration.govt.nz/visas/china-working-holiday-visa/',
    'nz-work': 'https://www.immigration.govt.nz/visas/accredited-employer-work-visa/',
    'au-wh': 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-462/first-work-holiday-462',
    'au-work': 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482',
    'us-work': 'https://travel.state.gov/content/travel/en/us-visas/employment/temporary-worker-visas.html',
    'kr-wh': 'https://whic.mofa.go.kr/contents.do?menuNo=90&contentsNo=38',
    'eu-visa': 'https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en',
    'eu-work': 'https://immigration-portal.ec.europa.eu/index_en',
}

def fetch(item):
    key, url = item
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=25) as response:
            html = response.read().decode('utf-8', errors='replace')
            html = re.sub(r'<(script|style)[\s\S]*?</\1>', '', html, flags=re.I)
            text = re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', html))
            return {'id': key, 'url': url, 'resolvedUrl': response.url, 'httpStatus': response.status, 'text': text[:160000]}
    except Exception as error:
        return {'id': key, 'url': url, 'error': str(error)}

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    sources = list(pool.map(fetch, URLS.items()))
target = pathlib.Path(__file__).resolve().parent.parent / 'research' / 'rule-review.json'
target.write_text(json.dumps({'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'sources': sources}, ensure_ascii=False, indent=2))
for source in sources:
    print(source['id'], source.get('httpStatus', source.get('error')), len(source.get('text', '')))

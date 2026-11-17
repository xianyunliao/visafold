"""Fetch official references; saves retrieval evidence, never treats reachability as policy verification."""
import concurrent.futures, datetime, json, pathlib, urllib.request, re

SOURCES = {
 'japan': 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
 'japan-wh': 'https://www.mofa.go.jp/j_info/visit/w_holiday/index.html',
 'korea': 'https://www.visa.go.kr/',
 'singapore': 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore/visa_requirements/visa-free',
 'singapore-wh': 'https://www.mom.gov.sg/passes-and-permits/work-holiday-programme/eligibility',
 'usa': 'https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html',
 'uk': 'https://www.gov.uk/standard-visitor',
 'uk-wh': 'https://www.gov.uk/youth-mobility/eligibility',
 'australia-wh': 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-462',
 'australia': 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600',
 'nz': 'https://www.immigration.govt.nz/visas/visitor-visa/',
 'nz-wh': 'https://www.immigration.govt.nz/visas/china-working-holiday-visa/',
 'schengen': 'https://home-affairs.ec.europa.eu/policies/schengen/schengen-area_en',
 'schengen-visa': 'https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en',
}

def fetch(item):
    key, url = item
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; VisafoldResearch/1.0)'})
        with urllib.request.urlopen(req, timeout=25) as response:
            html = response.read().decode('utf-8', errors='replace')
            html = re.sub(r'<(script|style)[\s\S]*?</\1>', '', html, flags=re.I)
            body = re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', html))
            return {'id':key, 'url':url, 'resolvedUrl':response.url, 'status':response.status, 'text':body[:140000]}
    except Exception as error:
        return {'id':key, 'url':url, 'error':str(error)}

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(fetch, SOURCES.items()))
    folder = pathlib.Path(__file__).resolve().parent.parent / 'research'
    folder.mkdir(exist_ok=True)
    (folder / 'official-sources.json').write_text(json.dumps({'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'sources':results}, ensure_ascii=False, indent=2))
    for source in results:
        print(source['id'], source.get('status', source.get('error')), len(source.get('text','')))

exec(open('scripts/explore.py').read().split('for website')[0])
def name(x):return re.sub(r'[^a-z0-9]','',re.sub(r'\b(phase\s*\d+|apartments?|residences?|society)\b','',x['apartment_name'].lower()))
def area(x):return x['carpet_area']*(10.7639 if x['website']=='magichomes' and x['carpet_area']<300 else 1)
G=collections.defaultdict(list)
for x in L:G[(name(x),x['locality'],x['bedroom'],x['floor'])].append(x)
print('group size',collections.Counter(len(a) for a in G.values()))
for x in [x for x in L if int(x['listing_id'].split('-')[1])>3003600][:15]:
 candidates=[y for y in G[(name(x),x['locality'],x['bedroom'],x['floor'])] if y!=x]
 print('\n',[(y['listing_id'],y['apartment_name'],y['price'],area(y),y['latitude'],y['longitude'],y['posted_by_contact'],y['total_floors'],y['bathroom']) for y in [x]+candidates])

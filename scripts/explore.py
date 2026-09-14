import json,collections,statistics,re
L=json.load(open('data/listings.json'));R=json.load(open('data/rentals.json'));P=json.load(open('data/projects.json'))
for website in sorted(set(x['website'] for x in L)):
 for typ in sorted(set(x['property_type'] for x in L)):
  a=[x for x in L if x['website']==website and x['property_type']==typ]
  print(website,typ,len(a),'small',sum(x['carpet_area']<300 for x in a),'median',statistics.median(x['carpet_area'] for x in a))
G=collections.defaultdict(list)
for x in L:G[x['posted_by_contact']].append(x)
print('\nHIGH FREQUENCY CONTACTS')
for phone,a in sorted(G.items(),key=lambda t:-len(t[1]))[:25]:
 print(phone,len(a),'localities',len(set(x['locality'] for x in a)),'names',len(set(x['posted_by_name'] for x in a)),'verified',sum(x['is_verified'] for x in a),'ppsf',round(statistics.median(x['price']/x['carpet_area'] for x in a)), 'examples',[(x['listing_id'],x['price'],x['carpet_area'],x['locality']) for x in a[:2]])
print('\nDUP GROUPS')
G=collections.defaultdict(list)
for x in L:G[(x['latitude'],x['longitude'])].append(x)
print('exact coords',len(G),collections.Counter(len(a) for a in G.values()))
for a in [a for a in G.values() if len(a)>1][:7]:
 print([{k:x[k] for k in ['listing_id','apartment_name','website','locality','bedroom','floor','carpet_area','price','posted_by_contact']} for x in a])
print('dates non Z',[x['posted_at'] for x in L if not x['posted_at'].endswith('Z')][:15])
print('projects mismatch all/live',sum(x['total_listings']!=sum(l['project_id']==x['project_id'] for l in L) for x in P),sum(x['total_listings']!=sum(l['project_id']==x['project_id'] and l['is_live'] for l in L) for x in P))
print('balewadi rent',sum(x['price'] for x in R if x['locality']=='balewadi'))

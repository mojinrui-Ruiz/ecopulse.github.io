import { useRef, useEffect, useState } from 'react'

const MAPBOX_TOKEN = 'pk.eyJ1IjoidG9tbXk5ODUiLCJhIjoiY21waDFtNXd5MGxieTJycjJkZWU5enN1bCJ9.b0eC0RKKXhJ0Pk5QyR8XFw'

// CONSTANTS
const CARBON_LIMIT = 40   // 40kg threshold — daily high-carbon choices accumulate to trigger overload
const BUDGET_FLOOR = -50  // Allow going slightly into debt before game over

const CITIES = {
  edinburgh: {
    name:'Edinburgh', flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', color:'#5bbfff', accentDark:'#1a3a5c',
    center:[-3.1883,55.9533], zoom:14, pitch:50, bearing:-15,
    startPos:[-3.1895,55.9367], currency:'£', budget:280,
    ambience:'🌫️ Cold, grey, drizzling. Classic November Edinburgh.',
  },
}

// LOCATIONS
const LOCATIONS = {
  edinburgh:[
    { id:'pollock',     name:'Home (Pollock Halls)', emoji:'🏠', type:'home',    lng:-3.1895, lat:55.9367 },
    { id:'lecture',     name:'Lecture Theatre',      emoji:'📚', type:'study',   lng:-3.1869, lat:55.9445 },
    { id:'calton',      name:'Calton Hill',           emoji:'🏔', type:'leisure', lng:-3.1841, lat:55.9561 },
    { id:'princes',     name:'Princes Street',        emoji:'🛍', type:'shopping',lng:-3.1936, lat:55.9524 },
    { id:'library',     name:'Main Library',          emoji:'🔬', type:'study',   lng:-3.1892, lat:55.9444 },
    { id:'supermarket', name:"Lidl / Sainsbury's",    emoji:'🛒', type:'food',    lng:-3.1960, lat:55.9500 },
    { id:'airport_ed',  name:'Edinburgh Airport',     emoji:'✈️', type:'travel',  lng:-3.3700, lat:55.9500 },
  ],
}

//  RANDOM EVENTS
// Triggered randomly after every 2nd activity choice
const RANDOM_EVENTS = {
  edinburgh:[
    {
      id:'storm', title:'⛈️ Sudden Storm', urgent:true,
      desc:"Out of nowhere, Edinburgh unleashes a horizontal rain attack. Buses are delayed. Your coat is soaked. It's 9pm and you're stranded at Waverley Station.",
      choices:[
        { id:'walk_rain', label:'🚶 Walk home (30 min in rain)', sub:'Free · Miserable · Carbon: 0', energy:-25, money:0, carbon:0, color:'#3ddc84',
          consequence:"You arrive soaked to the bone. You develop a mild cold. Your commitment to the environment is noted by no one." },
        { id:'uber_rain', label:'🚕 Emergency Uber', sub:'£14 · Warm · Instant relief', energy:+5, money:-14, carbon:0.52, color:'#ff5c5c',
          consequence:"Warm, dry, and slightly guilty. The driver plays 'Mr. Brightside'. You feel fine about everything." },
        { id:'shelter_pub', label:'🍺 Wait it out in a pub', sub:'£5 pint · Tactical delay', energy:+10, money:-5, carbon:0.1, color:'#f5a623',
          consequence:"One pint becomes two. The rain stops. You walk home only slightly damp and significantly cheerful." },
      ],
    },
    {
      id:'flatmate_party', title:'🎉 Flatmate\'s Birthday Party', urgent:false,
      desc:"Your flatmate is turning 22 and has invited the entire floor. The music is loud. The kitchen smells of supermarket prosecco. Your essay is due in 14 hours.",
      choices:[
        { id:'join_party', label:'🥂 Join the party (it\'s only midnight)', sub:'Social capital +100', energy:-10, money:-8, carbon:0.5, color:'#f5a623',
          consequence:"You stay until 3am. The essay is submitted at 8:59am. You pass. Barely." },
        { id:'library_escape', label:'📚 Escape to Main Library', sub:'Noise cancellation mode', energy:-15, money:0, carbon:0.05, color:'#3ddc84',
          consequence:"You finish the essay by 2am. You return home to find the party still going. You sleep in the library." },
        { id:'hermit_mode', label:'🎧 Lock door, noise cancelling headphones', sub:'Antisocial but effective', energy:-5, money:0, carbon:0, color:'#3ddc84',
          consequence:"Essay done. Flatmate relationship slightly strained. Worth it." },
      ],
    },
    {
      id:'heating_bill', title:'💸 Shock Heating Bill', urgent:true,
      desc:"Your landlord just forwarded this month's gas bill. It's £85. Split between 4 people. Your flatmates are blaming each other. You know exactly who left the heating at 24°C for two weeks.",
      choices:[
        { id:'pay_guilt', label:'💳 Pay your share silently', sub:'£21.25 · Keep the peace', energy:0, money:-21, carbon:0, color:'#f5a623',
          consequence:"Paid. The flat is awkward for a week. Life continues." },
        { id:'heating_pact', label:'🌡️ Propose a flat heating agreement', sub:'Max 19°C after 11pm', energy:+5, money:-10, carbon:-2.0, color:'#3ddc84',
          consequence:"The flat agrees. Carbon drops. Someone still breaks the agreement in Week 3." },
        { id:'argue_bill', label:'😤 Start a flat group chat debate', sub:'Drama mode activated', energy:-15, money:-5, carbon:0, color:'#ff5c5c',
          consequence:"Two hours of passive-aggressive messages. The bill gets split unevenly. Everyone is annoyed." },
      ],
    },
    {
      id:'dissertation_crisis', title:'📄 Dissertation Draft Crisis', urgent:true,
      desc:"Your supervisor emails at 11pm: 'Your draft needs significant revision. The methodology section is unclear.' Your defence is in 3 weeks. You have 6,000 words to rewrite.",
      choices:[
        { id:'all_night_cafe', label:'☕ Coffee shop all-nighter', sub:'£12 on flat whites · High carbon delivery food', energy:-35, money:-20, carbon:5.0, color:'#ff5c5c',
          consequence:"You rewrite 3,000 words. The coffee gives you heart palpitations. The methodology is better." },
        { id:'library_grind', label:'📚 Main Library until 3am', sub:'Free · Shared heating', energy:-25, money:0, carbon:0.05, color:'#3ddc84',
          consequence:"Long night. Good work. Zero carbon. The library quietly heroic." },
        { id:'sleep_fresh', label:'😴 Sleep now, start fresh at 6am', sub:'Bold strategy', energy:+20, money:0, carbon:0, color:'#3ddc84',
          consequence:"You wake at 6am with clarity. You finish the revision by noon. Your supervisor is satisfied." },
      ],
    },
    {
      id:'amazon_temptation', title:'📦 Amazon Prime Notification', urgent:false,
      desc:"Your phone pings. '48-hour flash sale — items in your wishlist are 40% off.' You've had a hard week. The buy button is right there. It's just things you were going to buy anyway. Probably.",
      choices:[
        { id:'buy_all', label:'🛒 Buy everything in the wishlist (£68)', sub:'Instant gratification', energy:+15, money:-68, carbon:8.5, color:'#ff5c5c',
          consequence:"Everything arrives in 6 separate packages over 3 days. You feel great for about 48 hours." },
        { id:'buy_one', label:'🤔 Buy only the essential item (£18)', sub:'Partial willpower', energy:+5, money:-18, carbon:2.0, color:'#f5a623',
          consequence:"Reasonable. You feel almost smug about your restraint." },
        { id:'close_tab', label:'❌ Close the tab', sub:'True discipline', energy:0, money:0, carbon:0, color:'#3ddc84',
          consequence:"You close the tab. You reopen it twice. You close it again. £0 spent. Integrity intact." },
      ],
    },
    {
      id:'deliveroo_double', title:'🛵 Deliveroo Flatmate Dilemma', urgent:false,
      desc:"Your flatmate suggests ordering Deliveroo together to split the delivery fee. But they want a burger and you want Thai. Different restaurants means two separate deliveries.",
      choices:[
        { id:'separate_delivery', label:'🍔🍜 Order separately anyway', sub:'£22 each · 2× packaging', energy:+25, money:-22, carbon:4.5, color:'#ff5c5c',
          consequence:"Two riders arrive 6 minutes apart. Six plastic containers between you. The irony is noted by both of you." },
        { id:'pickup_one', label:'🚶 Walk to collect a shared order', sub:'One restaurant · Half packaging', energy:-5, money:-14, carbon:1.2, color:'#3ddc84',
          consequence:"You compromise on a place you both like. One bag, half the packaging. Turns out it was the better option anyway." },
        { id:'cook_together', label:'🍳 Cook together from the fridge', sub:'Free · Actually fun', energy:+15, money:-8, carbon:0.5, color:'#3ddc84',
          consequence:"You find enough in the fridge to make pasta. Your flatmate can actually cook. This becomes a weekly thing." },
      ],
    },
    {
      id:'parents_visit', title:'👨‍👩‍👧 Parents Are Visiting', urgent:false,
      desc:"Your parents arrive from China for 3 days. They want to see everything Edinburgh has to offer — the castle, Arthur's Seat, the Royal Mile. They also insist on paying for dinner every night.",
      choices:[
        { id:'full_tourist', label:'🚕 Uber everywhere for 3 days', sub:'£60 transport · High carbon', energy:+30, money:-60, carbon:8.0, color:'#ff5c5c',
          consequence:"Three days of comfort. Edinburgh Castle, Royal Mile, dinner on George Street. Your parents are happy. Your carbon is not." },
        { id:'metro_tour', label:'🚌 Show them the Lothian Bus + walk', sub:'£20 transport · Low carbon', energy:+20, money:-20, carbon:1.8, color:'#3ddc84',
          consequence:"They are amazed the bus costs £1.80. You walk up Calton Hill together. They start questioning why anyone owns a car." },
        { id:'local_guide', label:'🗺️ Neighbourhood walk + local restaurant', sub:'£35 · Very low carbon', energy:+25, money:-35, carbon:0.8, color:'#3ddc84',
          consequence:"You show them the neighbourhood you actually live in. They understand your life here for the first time." },
      ],
    },
    {
      id:'storm_indoors', title:'🌧️ Severe Weather Warning', urgent:true,
      desc:"Storm Eowyn hits Edinburgh. 80mph gusts. The university has cancelled all in-person classes. You're stuck in Pollock Halls for the day. Everything outside is closed.",
      choices:[
        { id:'delivery_day', label:'🍕 Order Deliveroo three times', sub:'£45 · Multiple packaging runs', energy:+30, money:-45, carbon:4.5, color:'#ff5c5c',
          consequence:"Three riders brave the storm to bring you food. Nine containers. You feel fed and faintly ridiculous." },
        { id:'cook_storm', label:'🍜 Cook from whatever is in the kitchen', sub:'Free · Improvised but fine', energy:+20, money:0, carbon:0.4, color:'#3ddc84',
          consequence:"You make a surprisingly decent meal from pasta and tinned tomatoes. The storm passes. You feel capable." },
        { id:'study_storm', label:'💻 Use the day to write your dissertation', sub:'Productivity unlocked', energy:-10, money:0, carbon:0.021, color:'#3ddc84',
          consequence:"2,000 words written. Zero carbon. Storm Eowyn was the most productive thing that happened this semester." },
      ],
    },
    {
      id:'package_mountain', title:'📦 The Package Mountain', urgent:false,
      desc:"Your dorm desk has somehow accumulated 9 packages from the last two weeks of online shopping. Amazon, ASOS, eBay. The cardboard alone could furnish a small apartment.",
      choices:[
        { id:'bin_all', label:'🗑️ Throw it all in general waste', sub:'2 minutes · Bad for everything', energy:0, money:0, carbon:3.5, color:'#ff5c5c',
          consequence:"Done in 90 seconds. Nine boxes to landfill. Edinburgh Council would not approve." },
        { id:'recycle_boxes', label:'♻️ Flatten and take to cardboard recycling bin', sub:'10 min · Proper disposal', energy:-5, money:0, carbon:-1.0, color:'#3ddc84',
          consequence:"Flattened, stacked, recycled. Low carbon. The right thing to do and you know it." },
        { id:'repurpose', label:'📦 Keep 2 boxes for storage, recycle the rest', sub:'Creative reuse', energy:-3, money:0, carbon:-0.5, color:'#3ddc84',
          consequence:"You now have two decent storage boxes under your bed. The rest is recycled. Obviously the right answer." },
      ],
    },
  ],
}

//  SCENARIOS (two-phase: travel → activity)
const TRAVEL_CHOICES = {
  ed_short:[
    { id:'t_walk',  anim:{icon:'🚶',move:true,speed:80,arc:false}, label:'🚶 Walk', sub:'Free · 15-25 min',      energy:-8,  money:0,   carbon:0,    color:'#3ddc84', consequence:'Zero emissions. Edinburgh at walking pace is genuinely beautiful.' },
    { id:'t_bike',  anim:{icon:'🚲',move:true,speed:65,arc:false}, label:'🚲 Rental bike', sub:'£2 · 10 min',   energy:-3,  money:-2,  carbon:0.01, color:'#3ddc84', consequence:'Near-zero emissions. The hills are real but manageable.' },
    { id:'t_bus',   anim:{icon:'🚌',move:true,speed:50,arc:false}, label:'🚌 Lothian Bus', sub:'£1.80 · 18 min', energy:+3,  money:-2,  carbon:0.18, color:'#f5a623', consequence:'Reliable. Warm. The app tells you exactly when it comes.' },
    { id:'t_uber',  anim:{icon:'🚕',move:true,speed:35,arc:false}, label:'🚕 Uber', sub:'£7-9 · 10 min',        energy:+6,  money:-8,  carbon:0.34, color:'#ff5c5c', consequence:'Comfortable but high carbon for a short trip.' },
  ],
  ed_medium:[
    { id:'t_walk',  anim:{icon:'🚶',move:true,speed:80,arc:false}, label:'🚶 Walk (30-35 min)', sub:'Free · Hilly', energy:-14, money:0,   carbon:0,    color:'#3ddc84', consequence:'Zero emissions. The hills are real. Your legs will know.' },
    { id:'t_bus',   anim:{icon:'🚌',move:true,speed:50,arc:false}, label:'🚌 Lothian Bus', sub:'£1.80 · 20 min',  energy:+3,  money:-2,  carbon:0.25, color:'#f5a623', consequence:'Good coverage. Runs every 10 minutes on most routes.' },
    { id:'t_bike',  anim:{icon:'🚲',move:true,speed:65,arc:false}, label:'🚲 Just Eat Cycles', sub:'£2 · 15 min', energy:-5,  money:-2,  carbon:0.01, color:'#3ddc84', consequence:'Fastest in traffic. Near-zero carbon.' },
    { id:'t_uber',  anim:{icon:'🚕',move:true,speed:35,arc:false}, label:'🚕 Uber', sub:'£9 · 12 min',           energy:+8,  money:-9,  carbon:0.41, color:'#ff5c5c', consequence:'Door to door but highest carbon option.' },
  ],
  ed_long:[
    { id:'t_tram',  anim:{icon:'🚊',move:true,speed:40,arc:false}, label:'🚊 Edinburgh Tram', sub:'£7.50 · 35 min · Direct to airport', energy:+2,  money:-8,  carbon:0.35, color:'#3ddc84', consequence:'Low carbon electric tram. Runs every 8 minutes.' },
    { id:'t_bus_a', anim:{icon:'🚌',move:true,speed:50,arc:false}, label:'🚌 Airlink Bus 100', sub:'£4.50 · 35 min', energy:0,   money:-5,  carbon:0.89, color:'#f5a623', consequence:'Cheapest airport option. Runs every 10 min from Waverley.' },
    { id:'t_uber',  anim:{icon:'🚕',move:true,speed:35,arc:false}, label:'🚕 Uber to airport', sub:'£25-30 · 25 min', energy:+8, money:-27, carbon:2.21, color:'#ff5c5c', consequence:'Convenient but 6× more carbon than the tram.' },
    { id:'t_taxi',  anim:{icon:'🚕',move:true,speed:35,arc:false}, label:'🚖 Black Cab', sub:'£25-35 · 25 min',   energy:+8,  money:-30, carbon:1.93, color:'#ff5c5c', consequence:'Classic option. Still much higher carbon than public transport.' },
  ]
}

const SCENARIOS = {
  pollock:{
    travelTitle:'Going back home · How do you get back?', travelContext:'End of the day · Pollock Halls', travelChoices:'ed_medium',
    title:"Home · Tonight's choices", context:"It's 8pm. Cold outside. Essay due tomorrow.",
    choices:[
      { id:'heat_full', anim:{icon:'🌡️',move:false}, label:'♨️ Heater full blast (22°C)', sub:'5 kWh gas · Cosy', energy:+25, money:-3, carbon:1.01, color:'#ff5c5c', consequence:'Warm and productive. Gas bill creeps up.' },
      { id:'heat_low',  anim:{icon:'🧥',move:false}, label:'🧥 Jumper + heater 18°C',    sub:'2.5 kWh · Manageable', energy:+12, money:-2, carbon:0.51, color:'#f5a623', consequence:'Bit chilly but fine. Saves 50% carbon.' },
      { id:'blanket',   anim:{icon:'🛋',move:false}, label:'🛋 Electric blanket only',   sub:'0.1 kWh · Very cold', energy:+3, money:0, carbon:0.021, color:'#3ddc84', consequence:"Scotland's grid is 70% renewable. Blanket = lowest carbon." },
      { id:'cook_home', anim:{icon:'🍲',move:false}, label:'🍲 Cook a proper meal', sub:'£6 · 0.5 kg CO₂ · Warm kitchen', energy:+20, money:-6, carbon:0.5, color:'#3ddc84', consequence:'Cooking heats the kitchen anyway. Practical and satisfying.' },
      { id:'early_bed', anim:{icon:'😴',move:false}, label:'😴 Early night, no heating', sub:'Free · Zero carbon · Bold', energy:+30, money:0, carbon:0, color:'#3ddc84', consequence:'7 hours sleep. Full energy tomorrow. Zero carbon tonight.' },
      { id:'hot_shower',anim:{icon:'🚿',move:false}, label:'🚿 Long hot shower to warm up', sub:'£1 · 0.8 kWh gas', energy:+15, money:-1, carbon:0.16, color:'#f5a623', consequence:'Warm for 20 minutes. Then back to cold. Classic avoidance strategy.' },
    ],
  },
  lecture:{
    travelTitle:'Getting to Lectures · How do you travel?', travelContext:'7am · 4°C · Pollock Halls to George Square · 2.8 km', travelChoices:'ed_medium',
    title:'At the Lecture · You made it.', context:"Cold hands. What did your commute cost?",
    choices:[
      { id:'focus',       anim:{icon:'📝',move:false}, label:'📝 Focus, take good notes', sub:'Productive session', energy:-8, money:0, carbon:0, color:'#3ddc84', consequence:'Worth the commute. Good lecture.' },
      { id:'coffee_run',  anim:{icon:'☕',move:false}, label:'☕ Sneak out for a coffee', sub:'£4 · Small treat', energy:+8, money:-4, carbon:0.3, color:'#f5a623', consequence:'The coffee helps. A recyclable cup.' },
      { id:'nap_lecture', anim:{icon:'😪',move:false}, label:'😪 Sleep through it', sub:'Free · Bold choice', energy:+15, money:0, carbon:0, color:'#f5a623', consequence:'You wake up with pen marks on your face. Someone took notes for you.' },
      { id:'rec_lecture', anim:{icon:'📱',move:false}, label:'📱 Record and leave early', sub:'Free · Efficient?', energy:-3, money:0, carbon:0, color:'#3ddc84', consequence:'You leave at the break. The recording sits unwatched for 3 days.' },
      { id:'campus_cafe', anim:{icon:'🥐',move:false}, label:'🥐 Breakfast in the café first', sub:'£5 · Nice start', energy:+18, money:-5, carbon:0.4, color:'#f5a623', consequence:'Warm croissant. Worth it. You arrive late but fed.' },
      { id:'study_group', anim:{icon:'👥',move:false}, label:'👥 Form a study group after', sub:'Free · Social · Useful', energy:-5, money:0, carbon:0, color:'#3ddc84', consequence:'You understand the lecture properly for the first time.' },
    ],
  },
  calton:{
    travelTitle:'Going to Calton Hill · How?', travelContext:'Rare sunny day · From Pollock Halls · 2.4 km', travelChoices:'ed_medium',
    title:'At Calton Hill · Best view in Edinburgh.', context:"You're at the top. The whole city below.",
    choices:[
      { id:'picnic',    anim:{icon:'🧺',move:false}, label:'🧺 Packed lunch from home', sub:'Homemade · Zero packaging', energy:+15, money:-3, carbon:0.5, color:'#3ddc84', consequence:'Perfect picnic day. Zero packaging waste.' },
      { id:'takeaway_c',anim:{icon:'🛍',move:false}, label:'🍔 Bought takeaway on the way', sub:'£8 · Lots of packaging', energy:+20, money:-8, carbon:2.2, color:'#ff5c5c', consequence:'Tasty but 4 plastic containers.' },
      { id:'just_view', anim:{icon:'📸',move:false}, label:'📸 Just enjoying the view', sub:'Free · Zero carbon', energy:+10, money:0, carbon:0, color:'#3ddc84', consequence:'Sometimes the best things are free.' },
      { id:'run_hill',  anim:{icon:'🏃',move:false}, label:'🏃 Run up for exercise', sub:'Free · Zero carbon · Exhausting', energy:+5, money:0, carbon:0, color:'#3ddc84', consequence:'You make it to the top. Your legs disagree with this decision.' },
      { id:'sketch_view',anim:{icon:'✏️',move:false}, label:'✏️ Sketch the city skyline', sub:'Free · Relaxing', energy:+12, money:0, carbon:0, color:'#3ddc84', consequence:'An hour passes. You have a decent drawing. Very peaceful.' },
      { id:'call_home', anim:{icon:'📞',move:false}, label:'📞 Video call parents from the top', sub:'Free · Meaningful', energy:+20, money:0, carbon:0.001, color:'#3ddc84', consequence:'Your parents see Edinburgh for the first time. They want to visit.' },
    ],
  },
  princes:{
    travelTitle:'Heading to Princes Street · How?', travelContext:'Saturday afternoon · 1.8 km', travelChoices:'ed_short',
    title:'On Princes Street · H&M sale on.', context:'Nice jacket. Do you need it?',
    choices:[
      { id:'buy_2',     anim:{icon:'🛍',move:false}, label:'🛍 Buy 2 new items (£40)', sub:'Fast fashion · High carbon', energy:+15, money:-40, carbon:17.84, color:'#ff5c5c', consequence:'17.84 kg CO₂ — two garments at 8.92 kg each. Felt good for 2 days.' },
      { id:'charity_p', anim:{icon:'♻️',move:true,speed:80,arc:false}, label:'♻️ Check Oxfam first', sub:'~£10 · 5 min walk', energy:+8, money:-10, carbon:0.3, color:'#3ddc84', consequence:'Better jacket for £8. Second-hand wins.' },
      { id:'no_buy_p',  anim:{icon:'🤔',move:false}, label:'🤔 Nothing · window shop only', sub:'Free · Disciplined', energy:0, money:0, carbon:0, color:'#3ddc84', consequence:"You go home. The coat you have is fine." },
      { id:'buy_1',     anim:{icon:'👕',move:false}, label:'👕 Buy just one item (£20)', sub:'Partial restraint', energy:+8, money:-20, carbon:8.92, color:'#f5a623', consequence:'One garment. 8.92 kg CO2. At least it was not two.' },
      { id:'vinted_p',  anim:{icon:'📱',move:false}, label:'📱 Browse Vinted instead', sub:'Free · Zero carbon · Smart', energy:+5, money:0, carbon:0, color:'#3ddc84', consequence:'You find the exact jacket for £12 on Vinted. 97% less carbon than new.' },
      { id:'cafe_break',anim:{icon:'☕',move:false}, label:'☕ Coffee break at Brew Lab', sub:'£4 · Small treat', energy:+15, money:-4, carbon:0.3, color:'#f5a623', consequence:'Good coffee. You walk past H&M again and still do not go in.' },
    ],
  },
  library:{
    travelTitle:'Going to the Main Library · How?', travelContext:'Deadline tonight · 1.5 km', travelChoices:'ed_short',
    title:'At the Library · Deadline mode.', context:'400 students. Shared heating. Your carbon share here is tiny.',
    choices:[
      { id:'study_long',  anim:{icon:'📚',move:false}, label:'📚 Stay until 2am', sub:'Shared heating · Low personal carbon', energy:-20, money:0, carbon:0.05, color:'#f5a623', consequence:'Essay done. Exhausted. Library carbon was tiny.' },
      { id:'study_short', anim:{icon:'📖',move:false}, label:'📖 2 hours then home', sub:'Balanced · Sensible', energy:-5, money:0, carbon:0.021, color:'#3ddc84', consequence:'Sensible. Heating divided by 400 students.' },
      { id:'order_in',    anim:{icon:'🛵',move:true,speed:40,arc:false}, label:'🛵 Order Deliveroo to the library', sub:'£12 · Chaotic delivery', energy:+20, money:-12, carbon:2.2, color:'#ff5c5c', consequence:'Delivery to a library. Bold. Packaging and rider journey: 2.2 kg CO₂.' },
      { id:'print_notes', anim:{icon:'🖨️',move:false}, label:'🖨️ Print all your notes (50 pages)', sub:'£2 · Paper waste', energy:-5, money:-2, carbon:0.15, color:'#f5a623', consequence:'50 pages. You use 12 of them. The rest sit untouched in your bag.' },
      { id:'digital_only',anim:{icon:'💻',move:false}, label:'💻 Go fully digital, no printing', sub:'Free · Zero paper waste', energy:-8, money:0, carbon:0, color:'#3ddc84', consequence:'All notes on your laptop. Sustainable and your bag is lighter.' },
      { id:'study_cafe',  anim:{icon:'☕',move:false}, label:'☕ Move to Starbucks instead', sub:'£5 · Warmer · Busier', energy:+10, money:-5, carbon:0.5, color:'#f5a623', consequence:'Better music. Worse concentration. You spend £8 before you notice.' },
    ],
  },
  supermarket:{
    travelTitle:"Going to the Supermarket · How?", travelContext:'Evening grocery run · 0.8 km', travelChoices:'ed_short',
    title:"At Lidl / Sainsbury's · What to buy?", context:'Self-catering saves money and carbon vs ordering in.',
    choices:[
      { id:'veg_cook',    anim:{icon:'🥦',move:false}, label:'🥦 Veg + eggs (cook at home)', sub:'£5 · Lowest carbon', energy:+15, money:-5, carbon:0.5, color:'#3ddc84', consequence:'Cheapest and lowest carbon option.' },
      { id:'chicken_buy', anim:{icon:'🍗',move:false}, label:'🍗 Chicken + rice', sub:'£8 · Medium', energy:+20, money:-8, carbon:1.2, color:'#f5a623', consequence:'Good protein. Decent carbon footprint.' },
      { id:'skip_shop',   anim:{icon:'🛵',move:true,speed:40,arc:false}, label:'🛵 Skip it, order Deliveroo', sub:'£14 · Lazy', energy:+25, money:-14, carbon:2.0, color:'#ff5c5c', consequence:'Food delivery: packaging + rider journey adds up. 4× the carbon of cooking at home.' },
      { id:'beef_buy',    anim:{icon:'🥩',move:false}, label:'🥩 Beef stir-fry', sub:'£10 · High carbon', energy:+25, money:-10, carbon:12.0, color:'#ff5c5c', consequence:'200g beef = 12 kg CO₂. The highest carbon meal you can make at home.' },
      { id:'bulk_buy',    anim:{icon:'🛒',move:false}, label:'🛒 Weekly bulk shop', sub:'£30 · Efficient · Less trips', energy:+15, money:-30, carbon:0.8, color:'#3ddc84', consequence:'One big shop instead of daily trips. Less packaging, less transport carbon.' },
      { id:'reduced_aisle',anim:{icon:'🏷️',move:false}, label:'🏷️ Yellow sticker reduced section', sub:'£3 · Nearly expired · Smart', energy:+12, money:-3, carbon:0.2, color:'#3ddc84', consequence:'Food that would have gone to waste. Best value in the shop.' },
    ],
  },
  airport_ed:{
    travelTitle:'Getting to Edinburgh Airport · How?', travelContext:'CNY break · 13 km to airport', travelChoices:'ed_long',
    title:'At Edinburgh Airport · Flying home?', context:'Family wants you home. Flynghai is 9,000 km away.',
    choices:[
      { id:'fly_home',   anim:{icon:'✈️',move:true,speed:18,arc:true}, label:'✈️ Direct flight (£680)', sub:'1,801 kg CO₂ · One way', energy:+40, money:-680, carbon:1801, color:'#ff5c5c', consequence:'1,801 kg CO₂ — more than your entire semester daily total.' },
      { id:'video_home', anim:{icon:'📱',move:false}, label:'📱 Stay, video call for CNY', sub:'Free · Emotionally hard', energy:-5, money:0, carbon:0.001, color:'#3ddc84', consequence:'Hard. Saves 1,801 kg CO₂.' },
      { id:'fly_offset', anim:{icon:'✈️',move:true,speed:18,arc:true}, label:'✈️ Fly + Gold Standard offsets (£710)', sub:'Fly anyway', energy:+40, money:-710, carbon:1801, color:'#f5a623', consequence:'Offsets fund real projects. Emissions still happened.' },
    ],
  },
}


//  ENDINGS
function getEnding(energy, carbon, money) {
  const lim = CARBON_LIMIT  // 40 kg

  // Game over endings
  if (money < BUDGET_FLOOR) return {
    grade:'D', title:'💸 Flat Broke', color:'#ff7a40',
    headline:"Your wallet gave up before your conscience did.",
    desc:'Budget ran out. In real life, when the money runs out, sustainable choices become the first casualty. This result is realistic and worth reflecting on.',
    advice:'Budget constraints are one of the biggest real-world barriers to sustainable behaviour for students. This is not a personal failure — it is a systemic problem.',
    fun_fact:'Studies show that lower-income households often have lower carbon footprints — not by choice, but because they cannot afford high-consumption options.',
  }
  if (carbon > lim) return {
    grade:'F', title:'💀 Carbon Overload', color:'#ff2222',
    headline:"You single-handedly warmed the planet by a measurable amount.",
    desc:`Carbon: ${Math.round(carbon)} kg CO₂e. The ${lim} kg session limit was breached. A single Edinburgh to Shanghai flight alone produces 1,801 kg CO₂e — that single decision dwarfs everything else combined.`,
    advice:'Reducing long-haul flight frequency is the single highest-impact personal climate action available to international students.',
    fun_fact:'The carbon from one Edinburgh to Shanghai return flight equals approximately 3,602 kg CO₂e — more than driving a petrol car from London to Cape Town.',
  }
  if (energy <= 0) return {
    grade:'D', title:'😰 Burned Out', color:'#ff5c5c',
    headline:"You tried to save the planet but forgot to save yourself.",
    desc:'Energy depleted. You made consistently low-carbon choices but pushed yourself past the breaking point. Sustainable living that destroys your wellbeing is not actually sustainable.',
    advice:'Behaviour change research shows that extreme sacrifice often triggers a rebound effect — people who sacrifice too much reward themselves with high-carbon choices later.',
    fun_fact:'Edinburgh students who walk everywhere burn approximately 80,000 extra calories per year. The planet appreciates it. Your knees may not.',
  }

  //  Completed all turns — graded by carbon and energy
  // Thresholds calibrated to 40 kg limit, 80 starting energy, 6 turns
  if (carbon < 8 && energy >= 65 && money > 50) return {
    grade:'A+', title:'🌿 Sustainable Balance', color:'#3ddc84',
    headline:"You cracked the code. Low carbon, high energy, budget intact.",
    desc:`${Math.round(carbon)} kg CO₂e total — that is ${Math.round((1-(carbon/lim))*100)}% below the session limit. You made consistently thoughtful choices without burning out. This is what sustainable behaviour actually looks like in practice.`,
    advice:'Share your strategy with your flatmates. Behaviour change is contagious, and peer influence is one of the most effective drivers of environmental action.',
    fun_fact:'If all Chinese international students in Edinburgh made choices like yours, the collective carbon saving would be equivalent to taking several hundred flights off the table every year.',
  }
  if (carbon < 15 && energy >= 50) return {
    grade:'A', title:'🌱 On the Right Track', color:'#7ddc84',
    headline:"Solid. A few high-carbon moments but mostly thoughtful choices.",
    desc:`${Math.round(carbon)} kg CO₂e. Most choices were deliberate, with a few comfort compromises along the way. You stayed well within the limit.`,
    advice:'The single most effective further change: avoid one long-haul flight per year. Everything else combined is secondary to that decision.',
    fun_fact:"Avoiding one Edinburgh to Shanghai flight saves more carbon than cycling every day for an entire year.",
  }
  if (carbon < 28 && energy >= 35) return {
    grade:'B', title:'📊 Average Footprint', color:'#f5a623',
    headline:"Comfortable choices dominated. You are statistically normal.",
    desc:`${Math.round(carbon)} kg CO₂e. You made some good calls and some convenient ones. The tension between comfort and carbon was real, and you resolved it the way most people do.`,
    advice:'Focus on the decisions that matter most: flights, heating, and food. Small daily choices add up, but the big three have the biggest impact.',
    fun_fact:'Most people underestimate how much of their footprint comes from a small number of high-carbon decisions rather than everyday habits.',
  }
  if (carbon < lim && energy < 35) return {
    grade:'C', title:'😔 Green but Exhausted', color:'#f5a623',
    headline:"Low carbon, but at what personal cost?",
    desc:`${Math.round(carbon)} kg CO₂e. Impressive carbon restraint, but your energy is nearly gone. Sustainable choices should not require heroic levels of sacrifice every time.`,
    advice:"Planning low-carbon choices in advance dramatically reduces the willpower cost. Habits that feel effortful at first become automatic over time.",
    fun_fact:'The most durable sustainable behaviours are ones that are also cheaper, more comfortable, or more social — not the ones that require the most sacrifice.',
  }
  return {
    grade:'C-', title:'📈 Comfortable but Costly', color:'#ff7a40',
    headline:"You prioritised comfort. You are not alone.",
    desc:`${Math.round(carbon)} kg CO₂e. High-carbon choices dominated. This is what happens when sustainable options are less convenient — and it is a design problem as much as a personal one.`,
    advice:'The most durable sustainable behaviours are those that are also easier, cheaper, or more enjoyable. Start there.',
    fun_fact:'Infrastructure shapes behaviour more than individual intention. Edinburgh is investing in more cycling infrastructure partly because it changes what feels like the obvious choice.',
  }
}

// ANIMATED TRANSPORT COMPONENT
// CSS-based SVG vehicle icons
function VehicleIcon({ type, color }) {
  const icons = {
    '🚕': <svg viewBox="0 0 48 24" width="48" height="24">
      <rect x="4" y="10" width="40" height="12" rx="3" fill={color} opacity="0.9"/>
      <rect x="10" y="4" width="22" height="10" rx="2" fill={color}/>
      <circle cx="12" cy="22" r="4" fill="#1a1a2e" stroke={color} strokeWidth="1.5"/>
      <circle cx="36" cy="22" r="4" fill="#1a1a2e" stroke={color} strokeWidth="1.5"/>
      <rect x="14" y="5" width="8" height="6" rx="1" fill="rgba(180,220,255,0.6)"/>
      <rect x="24" y="5" width="7" height="6" rx="1" fill="rgba(180,220,255,0.6)"/>
    </svg>,
    '🚌': <svg viewBox="0 0 56 24" width="56" height="24">
      <rect x="2" y="4" width="52" height="18" rx="3" fill={color} opacity="0.9"/>
      <rect x="4" y="6" width="8" height="7" rx="1" fill="rgba(180,220,255,0.6)"/>
      <rect x="14" y="6" width="8" height="7" rx="1" fill="rgba(180,220,255,0.6)"/>
      <rect x="24" y="6" width="8" height="7" rx="1" fill="rgba(180,220,255,0.6)"/>
      <rect x="34" y="6" width="8" height="7" rx="1" fill="rgba(180,220,255,0.6)"/>
      <circle cx="10" cy="22" r="3" fill="#1a1a2e" stroke={color} strokeWidth="1.5"/>
      <circle cx="40" cy="22" r="3" fill="#1a1a2e" stroke={color} strokeWidth="1.5"/>
    </svg>,
    '🚇': <svg viewBox="0 0 56 22" width="56" height="22">
      <rect x="2" y="3" width="52" height="16" rx="4" fill={color} opacity="0.9"/>
      <rect x="4" y="5" width="10" height="8" rx="1" fill="rgba(180,220,255,0.7)"/>
      <rect x="17" y="5" width="10" height="8" rx="1" fill="rgba(180,220,255,0.7)"/>
      <rect x="30" y="5" width="10" height="8" rx="1" fill="rgba(180,220,255,0.7)"/>
      <rect x="43" y="5" width="8"  height="8" rx="1" fill="rgba(180,220,255,0.7)"/>
      <rect x="0" y="19" width="56" height="3" rx="1" fill={color} opacity="0.4"/>
    </svg>,
    '🚶': <svg viewBox="0 0 20 36" width="20" height="36">
      <circle cx="10" cy="4" r="4" fill={color}/>
      <line x1="10" y1="8" x2="10" y2="22" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="10" y1="22" x2="5"  y2="34" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="10" y1="22" x2="15" y2="34" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="10" y1="13" x2="3"  y2="19" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="10" y1="13" x2="17" y2="17" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>,
    '🚲': <svg viewBox="0 0 40 28" width="40" height="28">
      <circle cx="8"  cy="20" r="7" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="32" cy="20" r="7" fill="none" stroke={color} strokeWidth="2"/>
      <line x1="8" y1="20" x2="20" y2="8"  stroke={color} strokeWidth="2"/>
      <line x1="20" y1="8" x2="32" y2="20" stroke={color} strokeWidth="2"/>
      <line x1="14" y1="8" x2="26" y2="8"  stroke={color} strokeWidth="2"/>
      <line x1="20" y1="8" x2="20" y2="4"  stroke={color} strokeWidth="2"/>
      <line x1="16" y1="4" x2="24" y2="4"  stroke={color} strokeWidth="2"/>
    </svg>,
    '✈️': <svg viewBox="0 0 60 28" width="60" height="28">
      <path d="M8,14 L48,14 Q58,14 58,20 Q58,22 52,22 L28,22 L24,28 L18,28 L22,22 L8,22 Z" fill={color} opacity="0.9"/>
      <path d="M24,14 L40,2 L44,4 L32,14 Z" fill={color}/>
      <path d="M14,14 L22,8 L24,9 L18,14 Z" fill={color} opacity="0.7"/>
    </svg>,
    '🚄': <svg viewBox="0 0 64 22" width="64" height="22">
      <path d="M2,11 Q2,4 12,4 L58,4 Q64,4 64,11 L64,18 Q64,20 58,20 L12,20 Q2,20 2,18 Z" fill={color} opacity="0.9"/>
      <path d="M2,11 L8,4 L12,4" fill={color} opacity="0.7"/>
      <rect x="8"  y="6" width="10" height="7" rx="1" fill="rgba(180,220,255,0.7)"/>
      <rect x="22" y="6" width="10" height="7" rx="1" fill="rgba(180,220,255,0.7)"/>
      <rect x="36" y="6" width="10" height="7" rx="1" fill="rgba(180,220,255,0.7)"/>
      <rect x="50" y="6" width="8"  height="7" rx="1" fill="rgba(180,220,255,0.7)"/>
      <rect x="0" y="20" width="64" height="2" rx="1" fill={color} opacity="0.3"/>
    </svg>,
    '🛵': <svg viewBox="0 0 40 24" width="40" height="24">
      <circle cx="8"  cy="18" r="5" fill="none" stroke={color} strokeWidth="2"/>
      <circle cx="32" cy="18" r="5" fill="none" stroke={color} strokeWidth="2"/>
      <path d="M8,18 L16,8 L26,8 L32,18" fill="none" stroke={color} strokeWidth="2"/>
      <rect x="18" y="4" width="10" height="6" rx="2" fill={color} opacity="0.8"/>
      <rect x="20" y="2" width="6"  height="4" rx="1" fill={color} opacity="0.6"/>
    </svg>,
  }
  return icons[type] || <span style={{fontSize:24}}>{type}</span>
}

//  EXHAUST / PARTICLE SYSTEM
function ExhaustTrail({ isHigh, x, y }) {
  const particles = Array.from({length: isHigh ? 8 : 4}, (_, i) => ({
    id: i,
    delay: i * 120,
    size: 4 + Math.random() * 8,
    dx: (Math.random() - 0.5) * 30,
    dy: -20 - Math.random() * 40,
  }))
  return (
    <div style={{ position:'absolute', left:x, top:y, pointerEvents:'none', zIndex:60 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:'absolute',
          width: p.size, height: p.size,
          borderRadius:'50%',
          background: isHigh ? `rgba(180,100,50,0.7)` : `rgba(61,220,132,0.7)`,
          animation: `particle${isHigh?'Smoke':'Leaf'} 1.4s ease-out ${p.delay}ms forwards`,
          transform: `translate(${p.dx}px, ${p.dy}px)`,
        }}/>
      ))}
    </div>
  )
}

//  WEATHER OVERLAY
function WeatherOverlay({ cityKey, ecoScore }) {
  const isShanghai = false  // Edinburgh only
  const smogLevel = Math.max(0, (100 - ecoScore) / 100)

  if (smogLevel < 0.2) return null

  return (
    <div style={{
      position:'absolute', inset:0, pointerEvents:'none', zIndex:5,
      background: false
        ? `radial-gradient(ellipse at 50% 30%, rgba(180,130,40,${smogLevel*0.28}) 0%, transparent 70%)`
        : `radial-gradient(ellipse at 50% 20%, rgba(80,80,100,${smogLevel*0.22}) 0%, transparent 60%)`,
      transition:'background 2s ease',
    }}/>
  )
}

//  RANDOM EVENT POPUP
function RandomEventPopup({ event, cityKey, onChoice }) {
  const [chosen, setChosen] = useState(null)
  const cityColor = CITIES[cityKey]?.color || '#5bbfff'
  const currSym = CITIES[cityKey]?.currency || '£'

  function handleChoice(ch) {
    setChosen(ch)
    setTimeout(() => onChoice(ch), 2000)
  }

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:200,
      background:'rgba(7,11,18,0.85)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      animation:'fadeIn 0.3s ease',
    }}>
      <div style={{
        background:'rgba(15,20,35,0.98)', backdropFilter:'blur(20px)',
        border:`1px solid ${event.urgent ? '#ff5c5c' : cityColor}44`,
        borderRadius:20, padding:'28px 28px 24px',
        maxWidth:500, width:'90%',
        boxShadow: event.urgent ? '0 0 40px rgba(255,92,92,0.15)' : `0 0 40px ${cityColor}15`,
        animation:'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{ fontSize:28 }}>{event.urgent ? '🚨' : '📌'}</div>
          <div>
            <div style={{ fontSize:10, color: event.urgent ? '#ff5c5c' : cityColor, textTransform:'uppercase', letterSpacing:'1.5px', fontWeight:700, marginBottom:3 }}>
              {event.urgent ? 'URGENT EVENT' : 'RANDOM EVENT'}
            </div>
            <div style={{ fontSize:18, fontWeight:800 }}>{event.title}</div>
          </div>
        </div>

        {/* Story */}
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.72)', lineHeight:1.7, background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'12px 14px', marginBottom:18 }}>
          {event.desc}
        </div>

        {/* Choices or consequence */}
        {!chosen ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {event.choices.map(ch => (
              <button key={ch.id} onClick={() => handleChoice(ch)} style={{
                background:`${ch.color}0d`, border:`0.5px solid ${ch.color}33`,
                borderRadius:12, padding:'12px 14px', color:'white',
                cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background=`${ch.color}1a`; e.currentTarget.style.borderColor=`${ch.color}55` }}
                onMouseLeave={e => { e.currentTarget.style.background=`${ch.color}0d`; e.currentTarget.style.borderColor=`${ch.color}33` }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{ch.label}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{ch.sub}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:2, alignItems:'flex-end', flexShrink:0, marginLeft:12 }}>
                    <span style={{ fontSize:10, color:ch.energy>0?'#f5a623':'#ff5c5c', fontFamily:'monospace' }}>⚡{ch.energy>0?'+':''}{ch.energy}</span>
                    <span style={{ fontSize:10, color:ch.money<0?'#ff5c5c':'#3ddc84', fontFamily:'monospace' }}>{currSym}{ch.money>0?'+':''}{ch.money}</span>
                    <span style={{ fontSize:10, color:ch.carbon>5?'#ff5c5c':ch.carbon<=0.5?'#3ddc84':'#f5a623', fontFamily:'monospace' }}>🌿{ch.carbon>0?'+':''}{ch.carbon}kg</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ background:`${chosen.color}0d`, border:`0.5px solid ${chosen.color}33`, borderRadius:12, padding:'16px', textAlign:'center', animation:'fadeIn 0.3s ease' }}>
            <div style={{ fontSize:14, color:chosen.color, fontWeight:600, marginBottom:8 }}>{chosen.label}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.6, fontStyle:'italic' }}>"{chosen.consequence}"</div>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes popIn{from{transform:scale(0.8) translateY(20px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}`}</style>
    </div>
  )
}


//  RESULT SCREEN COMPONENT
const STAR_MAP = {'A+':5,'A':4,'B':3,'C':3,'C-':2,'D':2,'F':1}
const GRADE_COLORS = {'A+':'#3ddc84','A':'#3ddc84','B':'#7ddc84','C':'#f5a623','C-':'#f5a623','D':'#ff5c5c','F':'#ff2222'}
const MOCK_LB = [
  {name:'Yuki_T',  grade:'A+', carbon:8,   city:'edinburgh'},
  {name:'Zara_M',  grade:'A',  carbon:12,  city:'edinburgh'},
  {name:'Chen_L',  grade:'A',  carbon:15,  city:'edinburgh'},
  {name:'Sam_K',   grade:'B',  carbon:22,  city:'edinburgh'},
  {name:'Mei_X',   grade:'B',  carbon:28,  city:'edinburgh'},
  {name:'Park_J',  grade:'C',  carbon:33,  city:'edinburgh'},
  {name:'Elena_R', grade:'C',  carbon:38,  city:'edinburgh'},
]

function StarRow({ grade, color }) {
  const count = STAR_MAP[grade] || 2
  return (
    <div style={{ display:'flex', justifyContent:'center', gap:5, margin:'10px 0' }}>
      {[0,1,2,3,4].map(i => (
        <svg key={i} viewBox="0 0 24 24" width="22" height="22"
          style={{ animation:`starPop 0.35s ${0.7+i*0.08}s cubic-bezier(0.34,1.56,0.64,1) both` }}>
          <path d="M12 2 L14.4 9.2 L22 9.2 L16 13.8 L18.2 21 L12 16.4 L5.8 21 L8 13.8 L2 9.2 L9.6 9.2 Z"
            fill={i < count ? color : 'rgba(255,255,255,0.12)'} />
        </svg>
      ))}
    </div>
  )
}

function TrophySVG({ color }) {
  return (
    <svg viewBox="0 0 80 80" width="80" height="80"
      style={{ animation:'trophyDrop 0.7s cubic-bezier(0.34,1.56,0.64,1) both', display:'block', margin:'0 auto' }}
      aria-hidden="true">
      <path d="M40 58 L32 70 L48 70 Z" fill="rgba(255,255,255,0.15)"/>
      <rect x="32" y="68" width="16" height="5" rx="2.5" fill="rgba(255,255,255,0.2)"/>
      <path d="M22 16 L22 38 C22 48 30 56 40 56 C50 56 58 48 58 38 L58 16 Z"
        fill={color} opacity="0.9"/>
      <path d="M22 16 L14 16 L14 26 C14 33 18 38 25 40 L22 38"
        stroke={color} strokeWidth="5" strokeLinecap="round" fill="none"/>
      <path d="M58 16 L66 16 L66 26 C66 33 62 38 55 40 L58 38"
        stroke={color} strokeWidth="5" strokeLinecap="round" fill="none"/>
      <ellipse cx="40" cy="36" rx="12" ry="12" fill="rgba(255,255,255,0.12)"/>
      <path d="M35 36 L39 40 L46 32" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ResultScreen({ ending, carbon, energy, money, cityKey, currSym, log, onReplay, onReset }) {
  const [tab, setTab] = useState('leaderboard')
  const [lb, setLb]   = useState(MOCK_LB)
  const [totalPlays, setTotalPlays] = useState(null)
  const [copied, setCopied] = useState(false)
  const gradeColor = GRADE_COLORS[ending.grade] || '#f5a623'
  const myName = 'Player_' + Math.random().toString(36).slice(2,5).toUpperCase()

  useEffect(() => {
    async function load() {
      try {
        const r = await window.storage.get('ecopulse-scores', true)
        const scores = r ? JSON.parse(r.value) : MOCK_LB
        const cr = await window.storage.get('ecopulse-count', true)
        const count = cr ? parseInt(cr.value) + 1 : 248
        await window.storage.set('ecopulse-count', String(count), true)
        setTotalPlays(count)
        const entry = { name: myName, grade: ending.grade, carbon: Math.round(carbon), city: cityKey, ts: Date.now() }
        const updated = [...scores, entry].sort((a,b) => a.carbon - b.carbon).slice(0, 20)
        await window.storage.set('ecopulse-scores', JSON.stringify(updated), true)
        setLb(updated)
      } catch(e) {
        setTotalPlays(248)
      }
    }
    load()
  }, [])

  function copyResult() {
    const text = `EcoPulse Carbon Survival
Result: ${ending.grade} — ${ending.title}
${Math.round(carbon)} kg CO₂e · Energy ${energy}% · ${currSym}${Math.round(money)} left · Edinburgh 🏴󠁧󠁢󠁳󠁣󠁴󠁿
"${ending.headline}"`
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const btn = (label, onClick, primary) => (
    <button onClick={onClick} style={{
      flex:1, padding:'11px', fontSize:13, fontWeight:600, cursor:'pointer',
      fontFamily:'inherit', borderRadius:10, border:'none', transition:'opacity .15s',
      background: primary ? gradeColor : 'rgba(255,255,255,0.08)',
      color: primary ? '#070b12' : 'rgba(255,255,255,0.7)',
    }}
      onMouseEnter={e => e.currentTarget.style.opacity='0.82'}
      onMouseLeave={e => e.currentTarget.style.opacity='1'}
    >{label}</button>
  )

  return (
    <div style={{ flex:1, overflowY:'auto', background:'#070b12' }}>

      {/* Hero trophy section */}
      <div style={{ textAlign:'center', padding:'28px 20px 16px',
        background:`radial-gradient(ellipse at 50% 0%, ${gradeColor}18 0%, transparent 70%)` }}>
        <TrophySVG color={gradeColor} />
        <div style={{ fontFamily:'monospace', fontSize:52, fontWeight:900, color:gradeColor,
          lineHeight:1, margin:'10px 0 4px',
          animation:'gradePop 0.5s 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
          textShadow:`0 0 30px ${gradeColor}55` }}>
          {ending.grade}
        </div>
        <div style={{ fontSize:18, fontWeight:700, color:'white', marginBottom:4 }}>{ending.title}</div>
        <StarRow grade={ending.grade} color={gradeColor} />
        <div style={{ fontSize:13, color:gradeColor, fontStyle:'italic', marginBottom:8, fontWeight:500 }}>
          "{ending.headline}"
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.55)', lineHeight:1.7, maxWidth:420, margin:'0 auto' }}>
          {ending.desc}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, padding:'0 16px 16px' }}>
        {[
          { l:'Carbon', v:`${Math.round(carbon)} kg`, c: carbon<100?'#3ddc84':carbon<150?'#f5a623':'#ff5c5c', icon:'🌿' },
          { l:'Energy', v:`${energy}%`,    c:'#f5a623', icon:'⚡' },
          { l:'Budget', v:`${currSym}${Math.round(money)}`, c:'#5bbfff', icon:'💰' },
        ].map(s => (
          <div key={s.l} style={{ background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.09)', borderRadius:12, padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:4 }}>{s.l}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:'0.5px solid rgba(255,255,255,0.08)', padding:'0 16px', marginBottom:0 }}>
        {['leaderboard','log','share'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'8px 14px', fontSize:12, fontWeight:600, cursor:'pointer',
            color: tab===t ? gradeColor : 'rgba(255,255,255,0.38)',
            background:'none', border:'none', borderBottom:`2px solid ${tab===t ? gradeColor : 'transparent'}`,
            fontFamily:'inherit', textTransform:'capitalize', letterSpacing:'0.3px', marginBottom:'-0.5px',
            transition:'color .15s',
          }}>{t === 'leaderboard' ? '🏆 Leaderboard' : t === 'log' ? '📋 My Decisions' : '📤 Share'}</button>
        ))}
      </div>

      {/* Leaderboard tab */}
      {tab === 'leaderboard' && (
        <div style={{ padding:'14px 16px' }}>
          {/* Total plays counter */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)',
            borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:2 }}>Total plays worldwide</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)' }}>You are play #{totalPlays?.toLocaleString() || '...'}</div>
            </div>
            <div style={{ fontFamily:'monospace', fontSize:28, fontWeight:800, color:'#5bbfff' }}>
              {totalPlays?.toLocaleString() || '...'}
            </div>
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>
            Top scores · lowest carbon wins
          </div>
          {lb.slice(0,10).map((s, i) => {
            const rankEmoji = i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`
            const gc = GRADE_COLORS[s.grade] || '#f5a623'
            const isMe = s.name === myName
            return (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 12px', borderRadius:10, marginBottom:5,
                background: isMe ? `${gradeColor}15` : 'rgba(255,255,255,0.04)',
                border: `0.5px solid ${isMe ? gradeColor+'44' : 'rgba(255,255,255,0.07)'}`,
              }}>
                <div style={{ fontSize:14, minWidth:24, textAlign:'center' }}>{rankEmoji}</div>
                <div style={{ flex:1, fontSize:12, fontWeight:600 }}>{s.name}{isMe && <span style={{ fontSize:10, opacity:.5, marginLeft:4 }}>(you)</span>}</div>
                <div style={{ fontSize:10 }}>{s.city==='edinburgh'?'🏴󠁧󠁢󠁳󠁣󠁴󠁿':'🇨🇳'}</div>
                <div style={{ fontSize:12, fontFamily:'monospace', color:'rgba(255,255,255,0.5)', minWidth:55, textAlign:'right' }}>{s.carbon} kg</div>
                <div style={{ fontSize:12, fontWeight:700, color:gc, minWidth:24, textAlign:'center' }}>{s.grade}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Decision log tab */}
      {tab === 'log' && (
        <div style={{ padding:'14px 16px' }}>
          {log.length === 0 ? (
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', padding:'8px 0' }}>No decisions recorded.</div>
          ) : log.map((e, i) => {
            const high = e.carbonDelta > 5
            const low  = e.carbonDelta <= 0.5
            const dot  = high ? '#ff5c5c' : low ? '#3ddc84' : '#f5a623'
            return (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:dot, flexShrink:0, marginTop:5 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:2 }}>{e.location}</div>
                  <div style={{ fontSize:12, fontWeight:600, marginBottom:2 }}>{e.choice}</div>
                  {e.consequence && <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.4 }}>{e.consequence}</div>}
                </div>
                <div style={{ fontSize:11, fontFamily:'monospace', color:dot, flexShrink:0, textAlign:'right' }}>
                  {e.carbonDelta>0?'+':''}{e.carbonDelta>=100?e.carbonDelta.toLocaleString():e.carbonDelta} kg
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Share tab */}
      {tab === 'share' && (
        <div style={{ padding:'14px 16px' }}>
          <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${gradeColor}33`, borderRadius:16, padding:'20px', textAlign:'center', marginBottom:14 }}>
            <div style={{ fontFamily:'monospace', fontSize:40, fontWeight:900, color:gradeColor, textShadow:`0 0 20px ${gradeColor}55` }}>{ending.grade}</div>
            <div style={{ fontSize:15, fontWeight:700, margin:'6px 0 2px' }}>{ending.title}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginBottom:10 }}>
              {Math.round(carbon)} kg CO₂e · Energy {energy}% · {currSym}{Math.round(money)} · Edinburgh 🏴󠁧󠁢󠁳󠁣󠁴󠁿
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>EcoPulse Carbon Survival Game · University of Edinburgh</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {btn(copied ? '✓ Copied!' : '📋 Copy result', copyResult, true)}
          </div>
        </div>
      )}

      {/* Insight card */}
      <div style={{ margin:'8px 16px 14px', background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px' }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>💡 Key insight</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.7, marginBottom:8 }}>{ending.advice}</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.38)', lineHeight:1.6, fontStyle:'italic', borderTop:'0.5px solid rgba(255,255,255,0.06)', paddingTop:8 }}>{ending.fun_fact}</div>
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:10, padding:'0 16px 28px' }}>
        {btn('🔄 Play again', onReplay, true)}
      </div>

      <style>{`
        @keyframes trophyDrop{from{transform:translateY(-50px)scale(0.4);opacity:0}to{transform:translateY(0)scale(1);opacity:1}}
        @keyframes gradePop{from{transform:scale(0)rotate(-10deg);opacity:0}to{transform:scale(1)rotate(0);opacity:1}}
        @keyframes starPop{from{transform:scale(0)rotate(-20deg);opacity:0}to{transform:scale(1)rotate(0);opacity:1}}
      `}</style>
    </div>
  )
}

//  MAIN GAME COMPONENT
export default function GamePage() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const playerMarkerRef = useRef(null)
  const locationMarkersRef = useRef([])
  const routeLayerRef = useRef(false)

  const [phase, setPhase] = useState('playing')
  const [cityKey, setCityKey] = useState('edinburgh')
  const [mapReady, setMapReady] = useState(false)
  const [mapResetKey, setMapResetKey] = useState(0)

  // Core stats
  const [energy,   setEnergy]   = useState(80)
  const [money,    setMoney]    = useState(280)
  const [carbon,   setCarbon]   = useState(0)
  const [turnsLeft,setTurnsLeft]= useState(6)
  const [log,      setLog]      = useState([])

  // Carbon Overload cinematic FX
  const [carbonFX, setCarbonFX]         = useState(null) // null | 'warning' | 'critical' | 'overload' | 'dissolve'
  const [fxCountdown, setFxCountdown]   = useState(5)

  // Eco / city health
  const [ecoScore,     setEcoScore]     = useState(100)
  const [achievements, setAchievements] = useState([])
  const [newBadge,     setNewBadge]     = useState(null)

  //  Eco Tech Tree
  // ecoPoints accumulated from low-carbon choices, spend on upgrades
  const [ecoPoints,    setEcoPoints]    = useState(0)
  const [upgrades,     setUpgrades]     = useState({})   // {upgradeId: true}
  const [showTechTree, setShowTechTree] = useState(false)
  const [newUpgrade,   setNewUpgrade]   = useState(null)  // flash notification

  // Tech tree definition — each upgrade has passive effects on future choices
  const TECH_TREE = {
    insulation:     { id:'insulation',    icon:'🏠', name:'Insulation Upgrade',   cost:8,  tier:1, desc:'Reduces all heating/AC carbon by 20%', effect:'heating_discount_0.2' },
    solar:          { id:'solar',         icon:'☀️', name:'Solar Panel',           cost:15, tier:2, desc:'Generates 1 eco point per turn passively', effect:'passive_eco_1', requires:'insulation' },
    ebike:          { id:'ebike',         icon:'🚴', name:'E-Bike Subscription',  cost:10, tier:1, desc:'All cycling options gain +5 energy (more fun)', effect:'bike_energy_5' },
    metro_pass:     { id:'metro_pass',    icon:'🎫', name:'Monthly Metro Pass',   cost:12, tier:2, desc:'All metro/bus trips cost 40% less money', effect:'transit_discount_0.4', requires:'ebike' },
    vegbox:         { id:'vegbox',        icon:'🥗', name:'Veg Box Subscription', cost:8,  tier:1, desc:'All cooking options give +5 energy bonus', effect:'cook_energy_5' },
    composting:     { id:'composting',    icon:'🌱', name:'Composting Setup',     cost:6,  tier:1, desc:'Reduce food waste carbon by 30%', effect:'food_discount_0.3' },
    community:      { id:'community',     icon:'👥', name:'Community Co-op',      cost:20, tier:3, desc:'Unlock special group action choices at library/market', effect:'unlock_community', requires:'insulation' },
    carbon_tracker: { id:'carbon_tracker',icon:'📊', name:'Carbon Tracker App',   cost:5,  tier:1, desc:'See exact CO₂ numbers before choosing (all options)', effect:'show_formula' },
  }

  // Apply upgrade effects to a choice's values
  function applyUpgrades(choice) {
    let { energy, money, carbon } = choice
    const id = choice.id || ''
    const anim = choice.animation || ''

    if (upgrades.insulation && (anim==='heater' || id.includes('ac_')))
      carbon = +(carbon * 0.8).toFixed(2)
    if (upgrades.solar)
      setEcoPoints(p => p + 1) // passive generation handled separately
    if (upgrades.ebike && (id.includes('bike') || id.includes('cycle')))
      energy = Math.min(100, energy + 5)
    if (upgrades.metro_pass && (anim==='bus' || id.includes('subway') || id.includes('metro') || id.includes('t_bus') || id.includes('t_subway')))
      money = +(money * 0.6).toFixed(0)
    if (upgrades.vegbox && (id.includes('cook') || id.includes('veg')))
      energy = Math.min(100, energy + 5)
    if (upgrades.composting && (anim==='food' || id.includes('food') || id.includes('waste')))
      carbon = +(carbon * 0.7).toFixed(2)

    return { ...choice, energy, money, carbon }
  }

  function buyUpgrade(upg) {
    if (ecoPoints < upg.cost) return
    if (upgrades[upg.id]) return
    if (upg.requires && !upgrades[upg.requires]) return
    setEcoPoints(p => p - upg.cost)
    setUpgrades(prev => ({ ...prev, [upg.id]: true }))
    setNewUpgrade(upg)
    setTimeout(() => setNewUpgrade(null), 3000)
    setShowTechTree(false)
  }

  //  Backpack / voucher system
  // Each item: { id, icon, name, desc, effect: {energy,money,carbon} }
  const [backpack,     setBackpack]     = useState([])
  const [showBackpack, setShowBackpack] = useState(false)
  const [usedItem,     setUsedItem]     = useState(null) // flash notification

  //  Eco phase (drives UI theme + audio)
  // Phase: 0=pristine(green), 1=warning(amber), 2=crisis(dark red), 3=collapse(black)
  const ecoPhase = ecoScore >= 70 ? 0 : ecoScore >= 40 ? 1 : ecoScore >= 15 ? 2 : 3

  //  Web Audio context ref
  const audioCtxRef  = useRef(null)
  const droneSrcRef  = useRef(null)
  const droneGainRef = useRef(null)

  // UI / event state
  const [activeScenario, setActiveScenario] = useState(null)
  const [travelPhase,    setTravelPhase]    = useState(false)
  const [chosenResult,   setChosenResult]   = useState(null)
  const [choicePage,     setChoicePage]     = useState(1)
  const [playerMoving,   setPlayerMoving]   = useState(false)
  const [floatingLabel,  setFloatingLabel]  = useState(null)
  const [randomEvent,    setRandomEvent]    = useState(null)
  const [activityCount,  setActivityCount]  = useState(0)
  const [exhaustPos,     setExhaustPos]     = useState(null)

  const cityConf  = cityKey ? CITIES[cityKey] : null
  const currSym   = cityConf?.currency || '£'
  const cityColor = cityConf?.color || '#5bbfff'
  const carbonLim = cityKey ? CARBON_LIMIT : 200

  // Map init
  useEffect(() => {
    if (!cityKey) return
    const conf = CITIES[cityKey]
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = MAPBOX_TOKEN
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: conf.center, zoom: conf.zoom, pitch: conf.pitch, bearing: conf.bearing, antialias: true,
      })
      map.current.on('load', () => {
        map.current.addLayer({
          id:'3d-buildings', source:'composite', 'source-layer':'building',
          filter:['==','extrude','true'], type:'fill-extrusion', minzoom:12,
          paint:{
            'fill-extrusion-color':'#1a2a3a',
            'fill-extrusion-height':['interpolate',['linear'],['zoom'],12,0,12.05,['get','height']],
            'fill-extrusion-base':  ['interpolate',['linear'],['zoom'],12,0,12.05,['get','min_height']],
            'fill-extrusion-opacity':0.7,
          },
        })
        setMapReady(true)
      })
    })
    return () => { if (map.current) { map.current.remove(); map.current = null; setMapReady(false) } }
  }, [cityKey, mapResetKey])

  // Update building colour from eco score
  useEffect(() => {
    if (!map.current || !mapReady) return
    const smog = Math.max(0,(100-ecoScore)/100)
    const isSh = false  // Edinburgh only
    try {
      const r = isSh ? Math.round(26+smog*130) : Math.round(26+smog*60)
      const g = Math.round(42-smog*25)
      const b = Math.round(58-smog*35)
      map.current.setPaintProperty('3d-buildings','fill-extrusion-color',`rgb(${r},${g},${b})`)
      map.current.setPaintProperty('3d-buildings','fill-extrusion-opacity', 0.7+smog*0.25)
    } catch(e) {}
  }, [ecoScore, mapReady])

  // Audio engine: ambient soundscape tied to ecoPhase
  useEffect(() => {
    if (phase !== 'playing') return
    // Create audio context on first user interaction (browser policy)
    function initAudio() {
      if (audioCtxRef.current) return
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        audioCtxRef.current = ctx

        // Master gain
        const masterGain = ctx.createGain()
        masterGain.gain.setValueAtTime(0.0, ctx.currentTime)
        masterGain.connect(ctx.destination)
        droneGainRef.current = masterGain

        // Layered oscillators for drone sound
        const freqs = [55, 110, 165, 220] // bass drone chord
        freqs.forEach(freq => {
          const osc = ctx.createOscillator()
          const oscGain = ctx.createGain()
          const filter = ctx.createBiquadFilter()
          filter.type = 'lowpass'
          filter.frequency.value = 400

          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(freq, ctx.currentTime)
          // Slight detune for richness
          osc.detune.setValueAtTime(Math.random() * 10 - 5, ctx.currentTime)
          oscGain.gain.setValueAtTime(0.06, ctx.currentTime)

          osc.connect(filter)
          filter.connect(oscGain)
          oscGain.connect(masterGain)
          osc.start()
        })

        // Slow LFO for pulsing effect
        const lfo = ctx.createOscillator()
        const lfoGain = ctx.createGain()
        lfo.frequency.setValueAtTime(0.15, ctx.currentTime)
        lfoGain.gain.setValueAtTime(0.015, ctx.currentTime)
        lfo.connect(lfoGain)
        lfoGain.connect(masterGain.gain)
        lfo.start()

        droneSrcRef.current = { masterGain, lfo }
      } catch(e) {
        console.log('Audio not available:', e)
      }
    }

    const handler = () => initAudio()
    window.addEventListener('click', handler, { once: true })
    return () => window.removeEventListener('click', handler)
  }, [phase])

  // Adjust drone volume and pitch based on ecoPhase
  useEffect(() => {
    if (!audioCtxRef.current || !droneGainRef.current) return
    const ctx = audioCtxRef.current
    const gain = droneGainRef.current
    // ecoPhase 0=silent/nature, 1=quiet drone, 2=louder, 3=loud+harsh
    const targetVolume = [0.0, 0.08, 0.22, 0.45][ecoPhase]
    gain.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + 3.0)
  }, [ecoPhase])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      try { audioCtxRef.current?.close() } catch(e) {}
    }
  }, [])

  // Spawn markers after map ready
  useEffect(() => {
    if (!mapReady || !cityKey) return
    const conf = CITIES[cityKey]
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      // Player marker with SVG avatar (not emoji)
      const playerEl = document.createElement('div')
      playerEl.id = 'player-marker'
      playerEl.style.cssText = 'display:flex;flex-direction:column;align-items:center;z-index:20;'
      playerEl.innerHTML = `
        <div id="player-bubble" style="
          background:rgba(7,11,18,0.95);border:1.5px solid ${conf.color};
          border-radius:10px;padding:4px 10px;font-size:10px;color:${conf.color};
          margin-bottom:5px;white-space:nowrap;font-family:Inter,sans-serif;
          display:flex;gap:8px;box-shadow:0 2px 16px ${conf.color}44;
        ">
          <span id="pb-energy" style="color:#f5a623;font-weight:700">⚡80</span>
          <span style="color:rgba(255,255,255,0.2)">|</span>
          <span id="pb-carbon" style="color:#3ddc84;font-weight:700">🌿0kg</span>
        </div>
        <div style="
          width:50px;height:50px;border-radius:50%;
          background:radial-gradient(circle at 35% 35%, ${conf.color}ee, ${conf.color}88);
          border:2.5px solid ${conf.color};
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 0 5px ${conf.color}22, 0 6px 20px rgba(0,0,0,0.8);
          animation:playerPulse 2.5s infinite;
          overflow:hidden;
        ">
          <svg viewBox="0 0 40 48" width="34" height="40" xmlns="http://www.w3.org/2000/svg">
            <!-- Head -->
            <circle cx="20" cy="12" r="9" fill="#FDDBB4"/>
            <!-- Hair -->
            <path d="M11 10 Q11 2 20 2 Q29 2 29 10 Q28 6 20 6 Q12 6 11 10Z" fill="#3d2b1a"/>
            <!-- Eyes -->
            <circle cx="16.5" cy="11" r="1.5" fill="#2d1a00"/>
            <circle cx="23.5" cy="11" r="1.5" fill="#2d1a00"/>
            <!-- Smile -->
            <path d="M16 15 Q20 18 24 15" stroke="#b5824a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
            <!-- Body / jacket -->
            <path d="M12 22 Q12 20 20 20 Q28 20 28 22 L30 38 Q20 40 10 38 Z" fill="${conf.color === '#5bbfff' ? '#1a3a6a' : '#3a1a00'}"/>
            <!-- Collar -->
            <path d="M20 20 L17 26 L20 24 L23 26 Z" fill="white" opacity="0.6"/>
            <!-- Arms -->
            <path d="M12 23 L7 33 Q8 35 10 34 L14 26Z" fill="${conf.color === '#5bbfff' ? '#1a3a6a' : '#3a1a00'}"/>
            <path d="M28 23 L33 33 Q32 35 30 34 L26 26Z" fill="${conf.color === '#5bbfff' ? '#1a3a6a' : '#3a1a00'}"/>
            <!-- Hands -->
            <circle cx="8" cy="35" r="3" fill="#FDDBB4"/>
            <circle cx="32" cy="35" r="3" fill="#FDDBB4"/>
            <!-- Legs -->
            <path d="M14 38 L12 48 L16 48 L18 40Z" fill="#1a1a2e"/>
            <path d="M26 38 L28 48 L24 48 L22 40Z" fill="#1a1a2e"/>
            <!-- Shoes -->
            <ellipse cx="14" cy="48" rx="4" ry="2" fill="#111"/>
            <ellipse cx="26" cy="48" rx="4" ry="2" fill="#111"/>
            <!-- Backpack strap hint -->
            <path d="M22 21 Q24 28 22 35" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" fill="none"/>
          </svg>
        </div>
        <div style="width:2px;height:12px;background:linear-gradient(${conf.color},transparent);margin-top:3px;border-radius:1px;"></div>
      `
      if (playerMarkerRef.current) playerMarkerRef.current.remove()
      playerMarkerRef.current = new mapboxgl.Marker({ element: playerEl, anchor:'bottom' })
        .setLngLat(conf.startPos).addTo(map.current)

      // Location markers — larger, with category ring
      locationMarkersRef.current.forEach(m => m.remove())
      locationMarkersRef.current = []
      ;(LOCATIONS[cityKey]||[]).forEach(loc => {
        const el = document.createElement('div')
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;'
        el.innerHTML = `
          <div class="loc-circle" style="
            width:48px;height:48px;border-radius:50%;
            background:radial-gradient(circle at 35% 30%, ${loc.color}ff, ${loc.color}88);
            border:2.5px solid ${loc.color};
            display:flex;align-items:center;justify-content:center;
            font-size:22px;
            box-shadow:
              0 0 0 5px ${loc.color}1a,
              0 0 0 10px ${loc.color}0a,
              0 6px 20px rgba(0,0,0,0.7),
              inset 0 1px 0 rgba(255,255,255,0.25);
            transition:box-shadow 0.25s,transform 0.25s;
            position:relative;
          ">
            ${loc.emoji}
            <div style="position:absolute;bottom:2px;right:2px;width:12px;height:12px;border-radius:50%;background:${loc.color === '#ff5c5c' ? '#ff2222' : loc.color};border:1.5px solid rgba(7,11,18,0.9);"></div>
          </div>
          <div style="
            background:rgba(7,11,18,0.92);color:white;
            font-size:10px;font-weight:600;letter-spacing:0.2px;
            padding:3px 10px;border-radius:10px;margin-top:5px;white-space:nowrap;
            border:0.5px solid ${loc.color}55;font-family:Inter,sans-serif;
            box-shadow:0 2px 8px rgba(0,0,0,0.5);
          ">${loc.name}</div>
          <div style="
            width:2px;height:10px;
            background:linear-gradient(${loc.color},transparent);
            margin-top:2px;border-radius:1px;
          "></div>
        `
        const circle = el.querySelector('.loc-circle')
        el.addEventListener('mouseenter', () => {
          circle.style.boxShadow = `0 0 0 6px ${loc.color}44,0 6px 24px rgba(0,0,0,0.7)`
          circle.style.transform = 'scale(1.08)'
        })
        el.addEventListener('mouseleave', () => {
          circle.style.boxShadow = `0 0 0 4px ${loc.color}22,0 4px 16px rgba(0,0,0,0.6)`
          circle.style.transform = 'scale(1)'
        })
        el.addEventListener('click', e => {
          e.stopPropagation()
          if (playerMoving || randomEvent) return
          if (activeScenario) { setActiveScenario(null); setChosenResult(null); setTravelPhase(false) }
          handleLocationClick(loc, mapboxgl)
        })
        locationMarkersRef.current.push(
          new mapboxgl.Marker({ element:el, anchor:'bottom' }).setLngLat([loc.lng,loc.lat]).addTo(map.current)
        )
      })
    })
  }, [mapReady, cityKey])

  // Keep player bubble stats up to date
  useEffect(() => {
    const eb = document.getElementById('pb-energy')
    const cb = document.getElementById('pb-carbon')
    if (eb) { eb.textContent = `⚡${energy}`; eb.style.color = energy < 25 ? '#ff5c5c' : '#f5a623' }
    if (cb) { cb.textContent = `🌿${carbon>=100?Math.round(carbon).toLocaleString():carbon.toFixed(1)}kg`; cb.style.color = carbon > carbonLim*0.7 ? '#ff5c5c' : '#3ddc84' }
  }, [energy, carbon, carbonLim])

  // Location click → show popup without moving player
  function handleLocationClick(loc, mapboxgl) {
    if (!SCENARIOS[loc.id]) return
    map.current.flyTo({ center:[loc.lng,loc.lat], zoom:14, duration:900, essential:true })
    const scen = SCENARIOS[loc.id]
    setTravelPhase(!!scen.travelChoices)
    setActiveScenario({ locId:loc.id, loc, scenario:scen })
    setChoicePage(1)
    setChoicePage(1)
  }

  //Move player avatar along route after travel choice
  async function movePlayerTo(loc, mapboxgl) {
    setPlayerMoving(true)
    const cur = playerMarkerRef.current?.getLngLat()
    const dst = [loc.lng, loc.lat]
    const d = Math.sqrt((cur.lng-dst[0])**2+(cur.lat-dst[1])**2)
    if (d < 0.0005) { setPlayerMoving(false); return }
    try {
      const mode = loc.type === 'travel' ? 'driving' : 'walking'
      const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/${mode}/${cur.lng},${cur.lat};${dst[0]},${dst[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`)
      const data = await res.json()
      const coords = data.routes?.[0]?.geometry?.coordinates || [[cur.lng,cur.lat],dst]
      if (routeLayerRef.current) {
        try { map.current.removeLayer('route-line'); map.current.removeSource('route-src') } catch(e) {}
      }
      map.current.addSource('route-src',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:coords}}})
      map.current.addLayer({id:'route-line',type:'line',source:'route-src',paint:{'line-color':cityColor,'line-width':3,'line-dasharray':[2,2],'line-opacity':0.7}})
      routeLayerRef.current = true
      map.current.flyTo({center:dst,zoom:15,duration:1500,essential:true})
      for (let i=0;i<=50;i++) {
        await new Promise(r=>setTimeout(r,28))
        const t=i/50, idx=Math.min(Math.floor(t*(coords.length-1)),coords.length-2)
        const frac=t*(coords.length-1)-idx
        const lng=coords[idx][0]+(coords[idx+1][0]-coords[idx][0])*frac
        const lat=coords[idx][1]+(coords[idx+1][1]-coords[idx][1])*frac
        playerMarkerRef.current?.setLngLat([lng,lat])
      }
      playerMarkerRef.current?.setLngLat(dst)
    } catch(e) { playerMarkerRef.current?.setLngLat(dst) }
    setPlayerMoving(false)
  }

  // Transport icon animation with SVG vehicle
  async function animateVehicle(mapboxgl, coords, icon, speedMs, isArc) {
    if (!coords || coords.length < 2) return
    const el = document.createElement('div')
    el.style.cssText = 'pointer-events:none;z-index:55;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.8));transition:transform 0.15s;'
    // Use SVG string for the vehicle
    const svgMap = {
      '🚕': `<svg viewBox="0 0 48 24" width="48" height="24"><rect x="4" y="10" width="40" height="12" rx="3" fill="#f5a623" opacity="0.9"/><rect x="10" y="4" width="22" height="10" rx="2" fill="#f5a623"/><circle cx="12" cy="22" r="4" fill="#1a1a2e" stroke="#f5a623" stroke-width="1.5"/><circle cx="36" cy="22" r="4" fill="#1a1a2e" stroke="#f5a623" stroke-width="1.5"/><rect x="14" y="5" width="8" height="6" rx="1" fill="rgba(180,220,255,0.6)"/><rect x="24" y="5" width="7" height="6" rx="1" fill="rgba(180,220,255,0.6)"/></svg>`,
      '🚌': `<svg viewBox="0 0 56 24" width="56" height="24"><rect x="2" y="4" width="52" height="18" rx="3" fill="#f5a623" opacity="0.9"/><rect x="4" y="6" width="8" height="7" rx="1" fill="rgba(180,220,255,0.6)"/><rect x="14" y="6" width="8" height="7" rx="1" fill="rgba(180,220,255,0.6)"/><rect x="24" y="6" width="8" height="7" rx="1" fill="rgba(180,220,255,0.6)"/><rect x="34" y="6" width="8" height="7" rx="1" fill="rgba(180,220,255,0.6)"/><circle cx="10" cy="22" r="3" fill="#1a1a2e" stroke="#f5a623" stroke-width="1.5"/><circle cx="40" cy="22" r="3" fill="#1a1a2e" stroke="#f5a623" stroke-width="1.5"/></svg>`,
      '🚇': `<svg viewBox="0 0 56 22" width="56" height="22"><rect x="2" y="3" width="52" height="16" rx="4" fill="#5bbfff" opacity="0.9"/><rect x="4" y="5" width="10" height="8" rx="1" fill="rgba(180,220,255,0.7)"/><rect x="17" y="5" width="10" height="8" rx="1" fill="rgba(180,220,255,0.7)"/><rect x="30" y="5" width="10" height="8" rx="1" fill="rgba(180,220,255,0.7)"/><rect x="43" y="5" width="8" height="8" rx="1" fill="rgba(180,220,255,0.7)"/><rect x="0" y="19" width="56" height="3" rx="1" fill="#5bbfff" opacity="0.3"/></svg>`,
      '🚶': `<svg viewBox="0 0 20 36" width="20" height="36"><circle cx="10" cy="4" r="4" fill="#3ddc84"/><line x1="10" y1="8" x2="10" y2="22" stroke="#3ddc84" stroke-width="2.5" stroke-linecap="round"/><line x1="10" y1="22" x2="5" y2="34" stroke="#3ddc84" stroke-width="2.5" stroke-linecap="round"/><line x1="10" y1="22" x2="15" y2="34" stroke="#3ddc84" stroke-width="2.5" stroke-linecap="round"/><line x1="10" y1="13" x2="3" y2="19" stroke="#3ddc84" stroke-width="2.5" stroke-linecap="round"/><line x1="10" y1="13" x2="17" y2="17" stroke="#3ddc84" stroke-width="2.5" stroke-linecap="round"/></svg>`,
      '🚲': `<svg viewBox="0 0 40 28" width="40" height="28"><circle cx="8" cy="20" r="7" fill="none" stroke="#3ddc84" stroke-width="2"/><circle cx="32" cy="20" r="7" fill="none" stroke="#3ddc84" stroke-width="2"/><line x1="8" y1="20" x2="20" y2="8" stroke="#3ddc84" stroke-width="2"/><line x1="20" y1="8" x2="32" y2="20" stroke="#3ddc84" stroke-width="2"/><line x1="14" y1="8" x2="26" y2="8" stroke="#3ddc84" stroke-width="2"/><line x1="20" y1="8" x2="20" y2="4" stroke="#3ddc84" stroke-width="2"/><line x1="16" y1="4" x2="24" y2="4" stroke="#3ddc84" stroke-width="2"/></svg>`,
      '✈️': `<svg viewBox="0 0 60 28" width="60" height="28"><path d="M8,14 L48,14 Q58,14 58,20 Q58,22 52,22 L28,22 L24,28 L18,28 L22,22 L8,22 Z" fill="#ff5c5c" opacity="0.9"/><path d="M24,14 L40,2 L44,4 L32,14 Z" fill="#ff5c5c"/><path d="M14,14 L22,8 L24,9 L18,14 Z" fill="#ff5c5c" opacity="0.7"/></svg>`,
      '🚄': `<svg viewBox="0 0 64 22" width="64" height="22"><path d="M2,11 Q2,4 12,4 L58,4 Q64,4 64,11 L64,18 Q64,20 58,20 L12,20 Q2,20 2,18 Z" fill="#3ddc84" opacity="0.9"/><path d="M2,11 L8,4 L12,4" fill="#3ddc84" opacity="0.7"/><rect x="8" y="6" width="10" height="7" rx="1" fill="rgba(180,220,255,0.7)"/><rect x="22" y="6" width="10" height="7" rx="1" fill="rgba(180,220,255,0.7)"/><rect x="36" y="6" width="10" height="7" rx="1" fill="rgba(180,220,255,0.7)"/><rect x="50" y="6" width="8" height="7" rx="1" fill="rgba(180,220,255,0.7)"/></svg>`,
      '🛵': `<svg viewBox="0 0 40 24" width="40" height="24"><circle cx="8" cy="18" r="5" fill="none" stroke="#c084fc" stroke-width="2"/><circle cx="32" cy="18" r="5" fill="none" stroke="#c084fc" stroke-width="2"/><path d="M8,18 L16,8 L26,8 L32,18" fill="none" stroke="#c084fc" stroke-width="2"/><rect x="18" y="4" width="10" height="6" rx="2" fill="#c084fc" opacity="0.8"/></svg>`,
      '🚊': `<svg viewBox="0 0 60 22" width="60" height="22"><rect x="2" y="3" width="56" height="16" rx="3" fill="#5bbfff" opacity="0.9"/><rect x="4" y="5" width="12" height="8" rx="1" fill="rgba(180,220,255,0.7)"/><rect x="20" y="5" width="12" height="8" rx="1" fill="rgba(180,220,255,0.7)"/><rect x="36" y="5" width="12" height="8" rx="1" fill="rgba(180,220,255,0.7)"/><rect x="0" y="19" width="60" height="2" rx="1" fill="#5bbfff" opacity="0.3"/></svg>`,
    }
    el.innerHTML = svgMap[icon] || `<span style="font-size:24px">${icon}</span>`
    const marker = new mapboxgl.Marker({element:el,anchor:'center'}).setLngLat(coords[0]).addTo(map.current)
    const N = isArc ? 60 : 48
    for (let i=0;i<=N;i++) {
      await new Promise(r=>setTimeout(r,speedMs||38))
      const t=i/N, idx=Math.min(Math.floor(t*(coords.length-1)),coords.length-2)
      const frac=t*(coords.length-1)-idx
      const lng=coords[idx][0]+(coords[idx+1][0]-coords[idx][0])*frac
      const lat=coords[idx][1]+(coords[idx+1][1]-coords[idx][1])*frac
      el.style.opacity = t<0.06?String(t*16):t>0.92?String((1-t)*12.5):'1'
      if (isArc) el.style.transform = `scale(${1+Math.sin(t*Math.PI)*0.7})`
      marker.setLngLat([lng,lat])
    }
    await new Promise(r=>setTimeout(r,400))
    marker.remove()
  }

  // Particle burst on map
  async function spawnParticles(mapboxgl, lngLat, isHigh) {
    const emojis = isHigh ? ['💨','☁️','🌫️','💨','☁️'] : ['🌿','✨','🌱','✓','🌿']
    for (let i=0;i<5;i++) {
      await new Promise(r=>setTimeout(r,i*100))
      const angle=(i/5)*360, d=0.00025+Math.random()*0.00025
      const el=document.createElement('div')
      el.style.cssText=`font-size:${14+Math.random()*10}px;pointer-events:none;z-index:55;transition:all 1.3s ease;opacity:1;`
      el.textContent=emojis[i]
      const m=new mapboxgl.Marker({element:el,anchor:'center'})
        .setLngLat([lngLat[0]+Math.cos(angle*Math.PI/180)*d,lngLat[1]+Math.sin(angle*Math.PI/180)*d*0.5])
        .addTo(map.current)
      setTimeout(()=>{el.style.opacity='0';el.style.transform=`translateY(-${20+Math.random()*35}px)scale(0.3)`;setTimeout(()=>m.remove(),1400)},180)
    }
  }

  // Make a choice
  function makeChoice(choice) {
    const newEnergy = Math.max(0,Math.min(100,energy+choice.energy))
    const newMoney  = money+choice.money
    const newCarbon = +(carbon+choice.carbon).toFixed(2)
    setEnergy(newEnergy); setMoney(newMoney); setCarbon(newCarbon)

    // Travel phase: move player, don't consume turn
    if (travelPhase) {
      setChosenResult({...choice,isTravelChoice:true})
      import('mapbox-gl').then(async({default:mapboxgl})=>{
        await movePlayerTo(activeScenario.loc,mapboxgl)
        const at = choice.anim
        if (!at) return
        let coords = [[activeScenario.loc.lng-0.005,activeScenario.loc.lat],[activeScenario.loc.lng,activeScenario.loc.lat]]
        try{ const s=map.current?.getSource('route-src'); if(s?._data?.geometry?.coordinates?.length>1) coords=s._data.geometry.coordinates }catch(e){}
        if (at.move) animateVehicle(mapboxgl,coords,at.icon,at.speed,at.arc)
        setTimeout(()=>spawnParticles(mapboxgl,[activeScenario.loc.lng,activeScenario.loc.lat],choice.carbon>3),1200)
        setTimeout(()=>{ try{map.current?.removeLayer('route-line');map.current?.removeSource('route-src');routeLayerRef.current=false}catch(e){} },3200)
      })
      showFloatingCarbon(choice.carbon,choice.color)

      // Game over check applies to travel phase too
      const lim = CARBON_LIMIT
      if (newEnergy<=0 || newMoney<BUDGET_FLOOR || newCarbon>lim) {
        let reason = 'energy'
        if (newMoney<BUDGET_FLOOR) reason='broke'
        else if (newCarbon>lim)    reason='carbon'
        if (typeof sessionStorage!=='undefined') sessionStorage.setItem('gameOverReason',reason)
        if (reason === 'carbon') {
          setActiveScenario(null); setChosenResult(null)
          setCarbonFX('overload'); setFxCountdown(5)
          let n=5
          const tick=setInterval(()=>{ n--; setFxCountdown(n); if(n<=0){ clearInterval(tick); setCarbonFX('dissolve'); setTimeout(()=>{ setCarbonFX(null); setPhase('result') },1200) } },1000)
        } else {
          setTimeout(()=>{ setActiveScenario(null); setChosenResult(null); setPhase('result') },2600)
        }
      }
      return
    }

    // Activity phase: consume turn
    const newTurns = turnsLeft - 1
    setTurnsLeft(newTurns)
    setLog(prev => [...prev, {
      location: activeScenario.loc.name,
      choice: choice.label,
      consequence: choice.consequence,
      carbonDelta: choice.carbon,
      energyDelta: choice.energy,
      moneyDelta: choice.money,
    }])

    // Apply upgrade effects — recalculate definitive values AFTER upgrades
    const effectiveChoice = applyUpgrades(choice)
    const finalEnergy = Math.max(0, Math.min(100, energy + effectiveChoice.energy))
    const finalMoney  = money + effectiveChoice.money
    const finalCarbon = +(carbon + effectiveChoice.carbon).toFixed(2)

    // Override state with upgrade-adjusted values
    setEnergy(finalEnergy)
    setMoney(finalMoney)
    setCarbon(finalCarbon)

    // Eco score update
    const newEco = Math.max(0, Math.min(100, ecoScore - effectiveChoice.carbon * 0.45 + (effectiveChoice.carbon < 0.5 ? 3 : 0)))
    setEcoScore(newEco)
    checkAchievements(effectiveChoice, newEco)

    // Award eco points for low-carbon behaviour
    const earnedPts = effectiveChoice.carbon < 0.5 ? 3 : effectiveChoice.carbon < 2 ? 1 : 0
    if (earnedPts > 0) setEcoPoints(p => p + earnedPts + (upgrades.solar ? 1 : 0))

    // Map animation
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      const at = choice.anim
      const dst = [activeScenario.loc.lng, activeScenario.loc.lat]
      let coords = [[dst[0] - 0.003, dst[1]], dst]
      try {
        const s = map.current?.getSource('route-src')
        if (s?._data?.geometry?.coordinates?.length > 1) coords = s._data.geometry.coordinates
      } catch(e) {}
      if (at?.move) animateVehicle(mapboxgl, coords, at.icon, at.speed, at.arc)
      setTimeout(() => spawnParticles(mapboxgl, dst, effectiveChoice.carbon > 5), at?.move ? 1000 : 300)
    })

    showFloatingCarbon(effectiveChoice.carbon, choice.color)
    setChosenResult(choice)

    //Game over check — uses definitive post-upgrade values
    const lim = CARBON_LIMIT
    const isGameOver = finalEnergy <= 0 || newTurns <= 0 || finalMoney < BUDGET_FLOOR || finalCarbon > lim
    if (isGameOver) {
      let reason = 'turns'
      if (finalEnergy <= 0)        reason = 'energy'
      else if (finalMoney < BUDGET_FLOOR) reason = 'broke'
      else if (finalCarbon > lim)  reason = 'carbon'
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('gameOverReason', reason)

      if (reason === 'carbon') {
        // CARBON OVERLOAD cinematic sequence
        setActiveScenario(null); setChosenResult(null)
        setCarbonFX('overload')
        setFxCountdown(5)
        let n = 5
        const tick = setInterval(() => {
          n--
          setFxCountdown(n)
          if (n <= 0) {
            clearInterval(tick)
            setCarbonFX('dissolve')
            setTimeout(() => { setCarbonFX(null); setPhase('result') }, 1200)
          }
        }, 1000)
      } else {
        setTimeout(() => { setActiveScenario(null); setChosenResult(null); setPhase('result') }, 2400)
      }
      return
    }

    // Check for random event (every 2nd activity)
    const newCount = activityCount+1
    setActivityCount(newCount)
    if (newCount%2===0 && !randomEvent) {
      const atHome = activeScenario?.loc?.id === 'pollock'
      const pool = (RANDOM_EVENTS[cityKey] || []).filter(e =>
        e.id === 'kuaidi_mountain' ? atHome : e.id !== 'kuaidi_mountain'
      )
      const evt = pool[Math.floor(Math.random()*pool.length)]
      setTimeout(()=>{ setActiveScenario(null); setChosenResult(null); setRandomEvent(evt) },2200)
    }
  }

  function handleRandomEventChoice(choice) {
    const newEnergy = Math.max(0,Math.min(100,energy+choice.energy))
    const newMoney  = money+choice.money
    const newCarbon = +(carbon+choice.carbon).toFixed(2)
    setEnergy(newEnergy); setMoney(newMoney); setCarbon(newCarbon)
    setLog(prev=>[...prev,{location:'⚡ Random Event',choice:choice.label,consequence:choice.consequence,carbonDelta:choice.carbon,energyDelta:choice.energy,moneyDelta:choice.money}])
    showFloatingCarbon(choice.carbon,choice.color)
    setTimeout(()=>{
      setRandomEvent(null)
      const lim = CARBON_LIMIT
      if (newEnergy<=0||newMoney<BUDGET_FLOOR||newCarbon>lim) {
        let reason = 'energy'
        if (newMoney<BUDGET_FLOOR) reason='broke'
        else if (newCarbon>lim)    reason='carbon'
        if (typeof sessionStorage!=='undefined') sessionStorage.setItem('gameOverReason',reason)
        setPhase('result')
      }
    },1800)
  }

  // Backpack vouchers catalogue
  const VOUCHERS = {
    tesco_voucher:  { id:'tesco_voucher',  icon:'🟥', name:'Tesco £1 Voucher',     desc:'Use in any food/shopping event to save £1', effect:{money:1,energy:0,carbon:0} },
    energy_drink:   { id:'energy_drink',   icon:'⚡', name:'Energy Boost',          desc:'+15 energy · Use when exhausted',           effect:{money:0,energy:15,carbon:0.1} },
    carbon_offset:  { id:'carbon_offset',  icon:'🌿', name:'Carbon Credit',         desc:'Offset 5 kg CO₂ from your total',           effect:{money:0,energy:0,carbon:-5} },
    free_bus_pass:  { id:'free_bus_pass',  icon:'🚌', name:'Free Bus Pass',          desc:'Next travel choice costs £0',               effect:{money:2,energy:3,carbon:0} },
    just_eat_voucher:{ id:'just_eat_voucher',icon:'🟠', name:'Just Eat £5 Voucher',  desc:'Save £5 on any food delivery order',        effect:{money:5,energy:0,carbon:0} },
    recycle_reward: { id:'recycle_reward', icon:'♻️', name:'Recycling Reward',       desc:'+£3 cash back · Eco bonus',                 effect:{money:3,energy:2,carbon:-1} },
  }

  function addToBackpack(voucherId) {
    const v = VOUCHERS[voucherId]
    if (!v || backpack.length >= 4) return // max 4 items
    setBackpack(prev => [...prev, { ...v, instanceId: Date.now() }])
  }

  function useBackpackItem(item) {
    setBackpack(prev => prev.filter(i => i.instanceId !== item.instanceId))
    setEnergy(e => Math.min(100, e + item.effect.energy))
    setMoney(m => m + item.effect.money)
    setCarbon(c => Math.max(0, +(c + item.effect.carbon).toFixed(2)))
    setUsedItem(item)
    setShowBackpack(false)
    setTimeout(() => setUsedItem(null), 2500)
  }

  function checkAchievements(choice, newEco) {
    const unlocks = []
    const id = choice.id || ''

    // Badge unlocks
    if (choice.carbon === 0 && !achievements.includes('zero_hero')) {
      unlocks.push({ id:'zero_hero', icon:'🌿', name:'Zero Hero' })
      addToBackpack('carbon_offset') // reward: carbon credit
    }
    if ((id.includes('walk') || id.includes('t_walk')) && !achievements.includes('pavement')) {
      unlocks.push({ id:'pavement', icon:'🚶', name:'Pavement Pioneer' })
      addToBackpack('free_bus_pass') // reward: free bus pass next time
    }
    if (id.includes('charity') && !achievements.includes('second_life')) {
      unlocks.push({ id:'second_life', icon:'♻️', name:'Second Life' })
      addToBackpack('tesco_voucher') // reward: Tesco voucher
    }
    if ((id.includes('cook') || id.includes('veg')) && !achievements.includes('home_chef')) {
      unlocks.push({ id:'home_chef', icon:'🍳', name:'Home Chef' })
      addToBackpack('tesco_voucher')
    }
    if (id.includes('recycle') || id.includes('sort')) {
      addToBackpack('recycle_reward') // always reward recycling with cash
    }
    if (newEco < 30 && !achievements.includes('crisis')) {
      unlocks.push({ id:'crisis', icon:'⚠️', name:'Carbon Crisis' })
    }
    if (newEco > 80 && turnsLeft < 4 && !achievements.includes('green_city')) {
      unlocks.push({ id:'green_city', icon:'🏆', name:'Green City' })
      addToBackpack('energy_drink')
    }

    if (unlocks.length) {
      setAchievements(prev => [...prev, ...unlocks.map(u => u.id)])
      setNewBadge(unlocks[0])
      setTimeout(() => setNewBadge(null), 3200)
    }
  }

  function showFloatingCarbon(val,color) {
    setFloatingLabel({text:val===0?'✓ 0 kg':`+${val>=100?val.toLocaleString():val} kg CO₂`,color})
    setTimeout(()=>setFloatingLabel(null),2600)
  }

  function closeScenario() { setActiveScenario(null); setChosenResult(null); setTravelPhase(false); setChoicePage(1) }
  function confirmTravel()  { setTravelPhase(false); setChosenResult(null) }

  //  Watch for game over via state changes (catches async setState lag)
  // Only fires when all turns have been used (turnsLeft reaches 0 after decrement)
  // Carbon/energy/money game over is handled directly in makeChoice to avoid race conditions
  useEffect(() => {
    if (phase !== 'playing') return
    if (turnsLeft > 0) return  // Only trigger on turn exhaustion here
    if (randomEvent || activeScenario || chosenResult) return  // Wait for UI to clear
    const t = setTimeout(() => setPhase('result'), 1200)
    return () => clearTimeout(t)
  }, [turnsLeft, phase, randomEvent, activeScenario, chosenResult])

  function startGame(key) {
    // Reset all stats first
    setPhase('playing')
    setEnergy(80); setMoney(280); setCarbon(0); setTurnsLeft(6)
    setLog([]); setActiveScenario(null); setChosenResult(null); setTravelPhase(false)
    setEcoScore(100); setAchievements([]); setActivityCount(0); setRandomEvent(null)
    setBackpack([]); setShowBackpack(false); setUsedItem(null)
    setEcoPoints(0); setUpgrades({}); setShowTechTree(false); setNewUpgrade(null)
    setCityKey('edinburgh')
    if (map.current) { map.current.remove(); map.current = null }
    setMapReady(false)
    setMapResetKey(k => k + 1)
    // Reset audio
    try { if (droneGainRef.current && audioCtxRef.current) {
      droneGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime)
    }} catch(e) {}
  }
  function resetGame() {
    setPhase('playing')
    setEnergy(80); setMoney(280); setCarbon(0); setTurnsLeft(6)
    setLog([]); setActiveScenario(null); setChosenResult(null); setTravelPhase(false)
    setEcoScore(100); setAchievements([]); setActivityCount(0); setRandomEvent(null)
    setBackpack([]); setShowBackpack(false); setUsedItem(null)
    setEcoPoints(0); setUpgrades({}); setShowTechTree(false); setNewUpgrade(null)
    if (map.current) { map.current.remove(); map.current = null }
    setMapReady(false)
    setCityKey('edinburgh')
    setMapResetKey(k => k + 1)

  }

  const ending = phase==='result' ? getEnding(energy,carbon,money) : null

  // CITY SELECT
  if (phase==='city_select') return (
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 24px',gap:24}}>
      <div style={{textAlign:'center',maxWidth:520}}>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:14}}>EcoPulse · Serious Game · Iteration 3</div>
        <h1 style={{fontSize:26,fontWeight:800,lineHeight:1.2,marginBottom:12}}>Dual-City Carbon<br/><span style={{color:'#3ddc84'}}>Survival Game</span></h1>
        <p style={{fontSize:13,color:'rgba(255,255,255,0.55)',lineHeight:1.7,marginBottom:22}}>
          Your <b style={{color:'#f5a623'}}>student avatar</b> lives on the map. Click locations to move, make decisions, and watch the city change. Random events will disrupt your plans. Every choice matters.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {[
            {key:'edinburgh',flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',name:'Edinburgh',color:'#5bbfff',desc:'One semester. November cold. Lectures, heating dilemmas, and one very expensive decision at the airport.',stats:'Start: £280 · Energy 80% · 6 turns'},
            ].map(opt=>(
            <button key={opt.key} onClick={()=>startGame(opt.key)} style={{
              background:`${opt.color}0d`,border:`0.5px solid ${opt.color}33`,
              borderRadius:16,padding:'22px 18px',textAlign:'left',
              cursor:'pointer',color:'white',fontFamily:'inherit',transition:'all 0.15s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.background=`${opt.color}1a`;e.currentTarget.style.borderColor=`${opt.color}55`}}
              onMouseLeave={e=>{e.currentTarget.style.background=`${opt.color}0d`;e.currentTarget.style.borderColor=`${opt.color}33`}}
            >
              <div style={{fontSize:30,marginBottom:10}}>{opt.flag}</div>
              <div style={{fontSize:17,fontWeight:700,color:opt.color,marginBottom:6}}>{opt.name}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',lineHeight:1.5,marginBottom:10}}>{opt.desc}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.28)',textTransform:'uppercase',letterSpacing:'0.5px'}}>{opt.stats}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // RESULT
  //  CARBON OVERLOAD CINEMATIC FX (full-screen)
  if (carbonFX === 'overload' || carbonFX === 'dissolve') return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background: carbonFX === 'dissolve' ? 'transparent' : '#000',
      animation: carbonFX === 'dissolve' ? 'goDissolve 1.2s ease forwards' : 'goIn 0.25s ease forwards',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      overflow:'hidden',
    }}>
      {carbonFX === 'overload' && (<>
        {/* Smoke particles */}
        {[...Array(22)].map((_,i) => (
          <div key={i} style={{
            position:'absolute',
            left:`${(i*13+7)%100}%`, bottom:`${-20+i*3}px`,
            width:`${35+i*12}px`, height:`${35+i*12}px`,
            borderRadius:'50%',
            background:`rgba(${30+i*4},${15+i*2},${10+i*2},0.65)`,
            filter:'blur(14px)',
            animation:`goSmoke ${2.5+i*0.18}s ease-in ${i*0.08}s infinite`,
          }}/>
        ))}
        {/* Red scan lines */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,20,20,0.04) 3px,rgba(255,20,20,0.04) 4px)',
          animation:'goScan 8s linear infinite',
        }}/>
        {/* Main content */}
        <div style={{ position:'relative', zIndex:10, textAlign:'center', animation:'goPop 0.5s 0.15s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          <div style={{ fontSize:88, marginBottom:16, filter:'drop-shadow(0 0 50px rgba(255,20,20,1))', animation:'goSpin 2.5s linear infinite' }}>☢️</div>
          <div style={{
            fontFamily:'monospace', fontSize:38, fontWeight:900, letterSpacing:'6px',
            color:'#ff1a1a',
            textShadow:'0 0 40px rgba(255,26,26,1), 0 0 80px rgba(255,26,26,0.7), 0 0 120px rgba(255,26,26,0.3)',
            animation:'goNeon 0.12s ease infinite', marginBottom:10,
          }}>CARBON OVERLOAD</div>
          <div style={{ fontFamily:'monospace', fontSize:13, color:'rgba(255,80,50,0.8)', letterSpacing:'3px', marginBottom:28 }}>
            CALCULATING PERMANENT ECOLOGICAL DAMAGE...
          </div>
          {/* Big countdown */}
          <div style={{
            fontFamily:'monospace', fontSize:80, fontWeight:900, lineHeight:1,
            color:'#ff1a1a',
            textShadow:'0 0 60px rgba(255,26,26,1), 0 0 120px rgba(255,26,26,0.6)',
            animation:'goBeat 1s ease infinite',
          }}>{fxCountdown}</div>
          {/* Draining bar */}
          <div style={{ width:300, height:6, background:'rgba(255,255,255,0.08)', borderRadius:3, margin:'20px auto 14px', overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:3,
              width:`${(fxCountdown/5)*100}%`,
              background:'linear-gradient(90deg,#ff1a1a,#ff6020)',
              boxShadow:'0 0 12px rgba(255,26,26,0.9)',
              transition:'width 0.92s linear',
            }}/>
          </div>
          <div style={{ fontFamily:'monospace', fontSize:11, color:'rgba(255,80,60,0.6)', letterSpacing:'2px' }}>
            {carbon.toFixed(1)} kg CO₂e accumulated · City health: {ecoScore.toFixed(0)}%
          </div>
        </div>
      </>)}
      <style>{`
        @keyframes goIn{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:scale(1)}}
        @keyframes goDissolve{0%{opacity:1;filter:blur(0)}100%{opacity:0;filter:blur(24px)}}
        @keyframes goPop{from{transform:scale(0.25);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes goSpin{0%{transform:rotate(0)scale(1)}50%{transform:rotate(180deg)scale(1.25)}100%{transform:rotate(360deg)scale(1)}}
        @keyframes goNeon{0%,100%{opacity:1}50%{opacity:0.78}}
        @keyframes goBeat{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
        @keyframes goSmoke{0%{transform:translateY(0)scale(0.6);opacity:0.6}100%{transform:translateY(-120vh)scale(1.8);opacity:0}}
        @keyframes goScan{0%{background-position:0 0}100%{background-position:0 100px}}
      `}</style>
    </div>
  )

  if (phase==='result'&&ending) return (
    <ResultScreen
      ending={ending} carbon={carbon} energy={energy} money={money}
      cityKey={cityKey} currSym={currSym} log={log}
      onReplay={()=>startGame('edinburgh')} onReset={resetGame}
    />
  )

  // PLAYING
  return (
    <div style={{flex:1,position:'relative',overflow:'hidden'}}>
      <div ref={mapContainer} style={{width:'100%',height:'100%'}} />

      {/* Atmospheric smog overlay */}
      <WeatherOverlay cityKey={cityKey} ecoScore={ecoScore} />

      {/* ── GLOBAL THEME OVERLAY based on ecoPhase ───────────────── */}
      {ecoPhase > 0 && (
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', zIndex:6,
          background: ecoPhase === 3
            ? 'rgba(0,0,0,0.55)'
            : ecoPhase === 2
              ? `rgba(20,20,30,0.38)`
              : `rgba(15,15,25,0.18)`,
          transition: 'background 3s ease',
          // Vignette effect intensifies with ecoPhase
          boxShadow: ecoPhase >= 2
            ? `inset 0 0 ${80+ecoPhase*60}px rgba(${ecoPhase===3?'80,0,0':'60,30,0'},0.6)`
            : 'none',
        }}/>
      )}

      {/* Eco phase status strip — replaces subtle building changes with obvious UI signal */}
      {ecoPhase > 0 && (
        <div style={{
          position:'absolute', top:0, left:0, right:0,
          height: ecoPhase === 3 ? 4 : 3,
          background: ecoPhase === 3
            ? 'linear-gradient(90deg,#ff0000,#ff5c5c,#ff0000)'
            : ecoPhase === 2
              ? 'linear-gradient(90deg,#ff5c5c,#ff7a40,#ff5c5c)'
              : 'linear-gradient(90deg,#f5a623,#ffcc44,#f5a623)',
          backgroundSize: '200% 100%',
          animation: ecoPhase >= 2 ? 'phaseStripe 1.5s linear infinite' : 'phaseStripe 3s linear infinite',
          zIndex:30, pointerEvents:'none',
        }}/>
      )}

      {/* Eco phase ambient label — shows in corner when degrading */}
      {ecoPhase >= 2 && (
        <div style={{
          position:'absolute', top:8, left:12, zIndex:25, pointerEvents:'none',
          display:'flex', alignItems:'center', gap:6,
          background: ecoPhase === 3 ? 'rgba(80,0,0,0.7)' : 'rgba(60,25,0,0.65)',
          backdropFilter:'blur(8px)',
          border: `0.5px solid ${ecoPhase===3?'rgba(255,0,0,0.5)':'rgba(255,92,92,0.4)'}`,
          borderRadius:8, padding:'5px 10px',
          animation: 'ecoLabelPulse 2s infinite',
        }}>
          <div style={{
            width:7, height:7, borderRadius:'50%',
            background: ecoPhase===3 ? '#ff0000' : '#ff5c5c',
            animation:'dotBlink 0.8s infinite',
          }}/>
          <span style={{fontSize:10,color:ecoPhase===3?'#ff6666':'#ff8c5c',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase'}}>
            {ecoPhase===3 ? '💀 ECO COLLAPSE' : '⚠️ ECO CRISIS'}
          </span>
        </div>
      )}

      {/* Positive injunctive feedback — social approval when carbon is low
          Implements Schultz et al. (2007): injunctive norms prevent boomerang effect.
          Shown when carbon < 40% of limit AND at least 2 turns played. */}
      {ecoPhase === 0 && carbon > 0 && carbon < carbonLim * 0.4 && turnsLeft < 7 && (
        <div style={{
          position:'absolute', top:8, left:12, zIndex:25, pointerEvents:'none',
          display:'flex', alignItems:'center', gap:6,
          background:'rgba(10,40,20,0.82)',
          backdropFilter:'blur(8px)',
          border:'0.5px solid rgba(61,220,132,0.45)',
          borderRadius:8, padding:'5px 10px',
          animation:'greenGlow 2.5s ease-in-out infinite',
        }}>
          <div style={{width:7,height:7,borderRadius:'50%',background:'#3ddc84',animation:'dotBlink 1.5s infinite'}}/>
          <span style={{fontSize:10,color:'#3ddc84',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase'}}>
            🌿 LOW CARBON — Edinburgh approves
          </span>
        </div>
      )}

      {/* Audio hint (first time) */}
      {ecoPhase === 1 && activityCount === 2 && (
        <div style={{
          position:'absolute', bottom:60, right:12, zIndex:25, pointerEvents:'none',
          background:'rgba(245,166,35,0.12)', border:'0.5px solid rgba(245,166,35,0.3)',
          borderRadius:10, padding:'8px 12px', fontSize:11, color:'rgba(245,166,35,0.8)',
          animation:'fadeIn 0.5s ease',
        }}>
          🔊 Click anywhere to enable ambient audio
        </div>
      )}

      {/* HUD */}
      <div style={{
        position:'absolute',top:12,left:'50%',transform:'translateX(-50%)',
        background: ecoPhase >= 2 ? 'rgba(20,5,5,0.95)' : 'rgba(7,11,18,0.92)',
        backdropFilter:'blur(14px)',
        border:`0.5px solid ${ecoPhase>=2?'rgba(255,92,92,0.4)':cityColor+'33'}`,borderRadius:14,padding:'10px 20px',
        display:'flex',gap:20,alignItems:'center',zIndex:20,
        boxShadow:`0 4px 24px rgba(0,0,0,0.4)`,
      }}>
        {[
          {label:'⚡ Energy',val:`${energy}%`,color:energy<25?'#ff5c5c':'#f5a623',warn:energy<25},
          {label:`${currSym} Budget`,val:`${currSym}${Math.round(money)}`,color:money<0?'#ff5c5c':money<20?'#f5a623':'#5bbfff',warn:money<BUDGET_FLOOR},
          {label:'🌿 Carbon',val:`${carbon>=100?Math.round(carbon).toLocaleString():carbon.toFixed(1)} kg`,color:carbon>carbonLim*0.8?'#ff5c5c':carbon>carbonLim*0.4?'#f5a623':'#3ddc84',warn:carbon>carbonLim*0.8},
          {label:'⏱ Turns',val:turnsLeft<=0?'DONE':`${turnsLeft} left`,color:turnsLeft<=1?'#ff5c5c':turnsLeft<=2?'#f5a623':'rgba(255,255,255,0.5)',warn:turnsLeft<=1},
        ].map(stat=>(
          <div key={stat.label} style={{textAlign:'center'}}>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>{stat.label}</div>
            <div style={{fontSize:14,fontWeight:700,color:stat.warn?'#ff5c5c':stat.color,fontFamily:'monospace',animation:stat.warn?'blink 0.8s infinite':undefined}}>{stat.val}</div>
          </div>
        ))}
        <div style={{width:'0.5px',height:32,background:'rgba(255,255,255,0.1)'}}/>
        <div style={{textAlign:'center',minWidth:72}}>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>🌆 City</div>
          <div style={{width:72,height:5,background:'rgba(255,255,255,0.07)',borderRadius:3,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${ecoScore}%`,background:ecoScore>60?'#3ddc84':ecoScore>30?'#f5a623':'#ff5c5c',borderRadius:3,transition:'width 0.8s ease,background 0.8s ease'}}/>
          </div>
          <div style={{fontSize:10,fontWeight:700,color:ecoScore>60?'#3ddc84':ecoScore>30?'#f5a623':'#ff5c5c',fontFamily:'monospace',marginTop:3}}>{Math.round(ecoScore)}%</div>
        </div>
      </div>

      {/* Achievement badges */}
      {achievements.length>0&&(
        <div style={{position:'absolute',top:82,left:'50%',transform:'translateX(-50%)',display:'flex',gap:5,zIndex:20,pointerEvents:'none'}}>
          {achievements.slice(-5).map(id=>{
            const icons={zero_hero:'🌿',pavement:'🚶',second_life:'♻️',home_chef:'🍳',crisis:'⚠️',green_city:'🏆'}
            return <div key={id} style={{background:'rgba(7,11,18,0.9)',border:'0.5px solid rgba(255,255,255,0.15)',borderRadius:16,padding:'4px 8px',fontSize:14}}>{icons[id]||'⭐'}</div>
          })}
        </div>
      )}

      {/* New upgrade notification */}
      {newUpgrade&&(
        <div style={{
          position:'absolute', top: achievements.length>0?112:82, left:'50%', transform:'translateX(-50%)',
          background:'rgba(61,220,132,0.12)', border:'0.5px solid rgba(61,220,132,0.4)',
          borderRadius:20, padding:'8px 18px',
          display:'flex', alignItems:'center', gap:8, zIndex:25,
          animation:'badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents:'none', whiteSpace:'nowrap',
        }}>
          <span style={{fontSize:20}}>{newUpgrade.icon}</span>
          <span style={{fontSize:12,color:'#3ddc84',fontWeight:600}}>Upgraded: {newUpgrade.name} — {newUpgrade.desc}</span>
        </div>
      )}

      {/* New badge notification */}
      {newBadge&&(
        <div style={{
          position:'absolute',top:110,left:'50%',transform:'translateX(-50%)',
          background:'rgba(61,220,132,0.12)',border:'0.5px solid rgba(61,220,132,0.4)',
          borderRadius:20,padding:'8px 18px',
          display:'flex',alignItems:'center',gap:8,zIndex:25,
          animation:'badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents:'none',
        }}>
          <span style={{fontSize:20}}>{newBadge.icon}</span>
          <span style={{fontSize:12,color:'#3ddc84',fontWeight:600}}>Achievement unlocked: {newBadge.name}</span>
        </div>
      )}

      {/* Danger warning */}
      {(money<20||carbon>carbonLim*0.8)&&!activeScenario&&!randomEvent&&(
        <div style={{
          position:'absolute',bottom:70,left:'50%',transform:'translateX(-50%)',
          background:'rgba(255,92,92,0.1)',backdropFilter:'blur(10px)',
          border:'0.5px solid rgba(255,92,92,0.4)',borderRadius:12,
          padding:'8px 18px',zIndex:25,display:'flex',alignItems:'center',gap:8,whiteSpace:'nowrap',
        }}>
          <span style={{fontSize:14}}>⚠️</span>
          <span style={{fontSize:12,color:'#ff5c5c',fontWeight:500}}>
            {money<BUDGET_FLOOR+20?`Budget ${currSym}${Math.round(money)} — budget almost gone — hitting £0/¥0 = game over`:`Carbon ${Math.round(carbon)} kg — approaching ${carbonLim} kg limit`}
          </span>
        </div>
      )}

      {/* ── BACKPACK BUTTON & PANEL ──────────────────────────────── */}
      <div style={{
        position:'absolute', bottom:20, right:12, zIndex:25,
        display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8,
      }}>
        {/* Used item notification */}
        {usedItem && (
          <div style={{
            background:'rgba(61,220,132,0.15)', border:'0.5px solid rgba(61,220,132,0.4)',
            borderRadius:12, padding:'8px 14px', fontSize:12, color:'#3ddc84',
            animation:'badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            whiteSpace:'nowrap', fontWeight:500,
          }}>
            {usedItem.icon} {usedItem.name} used! {usedItem.effect.money>0?`+${'£'}${usedItem.effect.money}`:''}{usedItem.effect.energy>0?` +⚡${usedItem.effect.energy}`:''}{usedItem.effect.carbon<0?` ${usedItem.effect.carbon}kg CO₂`:''}
          </div>
        )}

        {/* Tech tree panel */}
        {showTechTree && (
          <div style={{
            background:'rgba(7,11,18,0.97)', backdropFilter:'blur(16px)',
            border:`0.5px solid rgba(61,220,132,0.25)`, borderRadius:14,
            padding:'14px', width:260,
            animation:'slideUp 0.2s ease',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'1px' }}>🌱 Eco Tech Tree</div>
              <div style={{ fontSize:11, color:'#3ddc84', fontFamily:'monospace', fontWeight:700 }}>{ecoPoints} pts available</div>
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginBottom:10, lineHeight:1.5 }}>
              Earn points by making low-carbon choices. Spend them on upgrades that permanently change your options.
            </div>
            {Object.values(TECH_TREE).map(upg => {
              const owned = !!upgrades[upg.id]
              const locked = upg.requires && !upgrades[upg.requires]
              const affordable = ecoPoints >= upg.cost
              return (
                <button key={upg.id} onClick={() => !owned && !locked && buyUpgrade(upg)}
                  disabled={owned || locked}
                  style={{
                    width:'100%', display:'flex', alignItems:'flex-start', gap:10,
                    background: owned ? 'rgba(61,220,132,0.08)' : locked ? 'rgba(255,255,255,0.02)' : affordable ? 'rgba(61,220,132,0.05)' : 'rgba(255,255,255,0.03)',
                    border: `0.5px solid ${owned?'rgba(61,220,132,0.3)':locked?'rgba(255,255,255,0.05)':affordable?'rgba(61,220,132,0.18)':'rgba(255,255,255,0.08)'}`,
                    borderRadius:10, padding:'9px 11px', color:'white',
                    cursor: owned||locked?'default':'pointer', fontFamily:'inherit', textAlign:'left',
                    marginBottom:6, opacity: locked ? 0.4 : 1, transition:'all 0.15s',
                  }}
                  onMouseEnter={e=>{ if(!owned&&!locked) e.currentTarget.style.background='rgba(61,220,132,0.12)' }}
                  onMouseLeave={e=>{ if(!owned&&!locked) e.currentTarget.style.background=affordable?'rgba(61,220,132,0.05)':'rgba(255,255,255,0.03)' }}
                >
                  <span style={{ fontSize:18, flexShrink:0 }}>{upg.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                      <span style={{ fontSize:11, fontWeight:600, color: owned?'#3ddc84':locked?'rgba(255,255,255,0.3)':'white' }}>{upg.name}</span>
                      <span style={{ fontSize:10, color: owned?'#3ddc84':affordable?'#f5a623':'rgba(255,255,255,0.3)', fontFamily:'monospace' }}>
                        {owned ? '✓ owned' : locked ? '🔒' : `${upg.cost}pt`}
                      </span>
                    </div>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', lineHeight:1.4 }}>{upg.desc}</div>
                    {locked && upg.requires && <div style={{ fontSize:9, color:'rgba(255,100,100,0.5)', marginTop:2 }}>Requires: {TECH_TREE[upg.requires]?.name}</div>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Backpack panel */}
        {showBackpack && backpack.length > 0 && (
          <div style={{
            background:'rgba(7,11,18,0.97)', backdropFilter:'blur(16px)',
            border:`0.5px solid ${cityColor}33`, borderRadius:14,
            padding:'14px', width:220,
            animation:'slideUp 0.2s ease',
          }}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:10}}>
              🎒 Backpack · Tap to use
            </div>
            {backpack.map(item => (
              <button key={item.instanceId} onClick={() => useBackpackItem(item)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:10,
                  background:'rgba(255,255,255,0.04)', border:`0.5px solid ${cityColor}22`,
                  borderRadius:10, padding:'9px 12px', color:'white',
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                  marginBottom:6, transition:'all 0.15s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background=`${cityColor}14`;e.currentTarget.style.borderColor=`${cityColor}44`}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor=`${cityColor}22`}}
              >
                <span style={{fontSize:22,flexShrink:0}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:600,marginBottom:1}}>{item.name}</div>
                  <div style={{fontSize:9,color:'rgba(255,255,255,0.38)',lineHeight:1.4}}>{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Tech Tree button */}
        <button onClick={() => { setShowTechTree(v => !v); setShowBackpack(false) }}
          style={{
            background: ecoPoints >= 5 ? 'rgba(61,220,132,0.12)' : 'rgba(255,255,255,0.05)',
            border: `0.5px solid ${ecoPoints>=5?'rgba(61,220,132,0.35)':'rgba(255,255,255,0.1)'}`,
            borderRadius:12, padding:'8px 14px',
            display:'flex', alignItems:'center', gap:8,
            color: ecoPoints>=5?'#3ddc84':'rgba(255,255,255,0.35)',
            cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600, transition:'all 0.2s',
          }}
        >
          🌱 Eco Tree
          <div style={{ background: ecoPoints>0?'#3ddc84':'rgba(255,255,255,0.1)', color:'#070b12', width:18, height:18, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800 }}>{ecoPoints}</div>
        </button>

        {/* Backpack toggle button */}
        <button onClick={() => setShowBackpack(v => !v)}
          style={{
            background: backpack.length > 0
              ? `${cityColor}22`
              : 'rgba(255,255,255,0.06)',
            border: `0.5px solid ${backpack.length > 0 ? cityColor+'44' : 'rgba(255,255,255,0.12)'}`,
            borderRadius:12, padding:'8px 14px',
            display:'flex', alignItems:'center', gap:8,
            color: backpack.length > 0 ? cityColor : 'rgba(255,255,255,0.4)',
            cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600,
            transition:'all 0.2s',
            position:'relative',
          }}
        >
          🎒 Backpack
          {backpack.length > 0 && (
            <div style={{
              background: cityColor, color:'#070b12',
              width:18, height:18, borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:800,
            }}>{backpack.length}</div>
          )}
        </button>
      </div>

      {/* Instruction */}
      {!activeScenario&&!playerMoving&&!randomEvent&&(
        <div style={{position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',background:'rgba(7,11,18,0.85)',backdropFilter:'blur(10px)',border:'0.5px solid rgba(255,255,255,0.09)',borderRadius:20,padding:'7px 18px',fontSize:12,color:'rgba(255,255,255,0.45)',pointerEvents:'none',whiteSpace:'nowrap'}}>
          👆 Click a location to move there
        </div>
      )}

      {/* Moving indicator */}
      {playerMoving&&(
        <div style={{position:'absolute',bottom:20,left:'50%',transform:'translateX(-50%)',background:'rgba(7,11,18,0.88)',backdropFilter:'blur(10px)',border:`0.5px solid ${cityColor}44`,borderRadius:20,padding:'7px 18px',fontSize:12,color:cityColor,whiteSpace:'nowrap',zIndex:20}}>
          🧑‍🎓 Moving...
        </div>
      )}

      {/* Floating carbon label */}
      {floatingLabel&&(
        <div style={{
          position:'absolute',top:'42%',left:'50%',transform:'translate(-50%,-50%)',
          fontFamily:'monospace',fontSize:26,fontWeight:900,
          color:floatingLabel.color,
          textShadow:`0 0 24px ${floatingLabel.color}88`,
          animation:'floatUp 2.6s ease forwards',pointerEvents:'none',zIndex:30,
        }}>{floatingLabel.text}</div>
      )}

      {/* Random Event overlay */}
      {randomEvent&&(
        <RandomEventPopup event={randomEvent} cityKey={cityKey} onChoice={handleRandomEventChoice}/>
      )}

      {/* Scenario popup — bottom panel */}
      {activeScenario&&(
        <div style={{
          position:'absolute',bottom:0,left:0,right:0,
          background:'rgba(7,11,18,0.97)',backdropFilter:'blur(20px)',
          borderTop:`1px solid ${cityColor}33`,
          padding:'16px 18px 18px',zIndex:25,
          animation:'slideUp 0.25s ease',
          maxHeight:'52%',overflowY:'auto',
        }}>
          {!chosenResult?(
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                    <div style={{fontSize:10,color:cityColor,textTransform:'uppercase',letterSpacing:'1px',fontWeight:600}}>
                      {activeScenario.loc.emoji} {activeScenario.loc.name}
                    </div>
                    {travelPhase&&<div style={{fontSize:9,background:'#f5a62322',border:'0.5px solid #f5a62344',borderRadius:4,padding:'2px 6px',color:'#f5a623',textTransform:'uppercase',letterSpacing:'0.5px'}}>Step 1 · Travel</div>}
                    {!travelPhase&&<div style={{fontSize:9,background:'#3ddc8422',border:'0.5px solid #3ddc8444',borderRadius:4,padding:'2px 6px',color:'#3ddc84',textTransform:'uppercase',letterSpacing:'0.5px'}}>Step 2 · Activity</div>}
                  </div>
                  <div style={{fontSize:15,fontWeight:700}}>{travelPhase?activeScenario.scenario.travelTitle:activeScenario.scenario.title}</div>
                </div>
                <button onClick={closeScenario} style={{background:'rgba(255,255,255,0.08)',border:'none',color:'rgba(255,255,255,0.5)',width:26,height:26,borderRadius:'50%',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
              </div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',lineHeight:1.6,marginBottom:12,background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'9px 12px'}}>
                {travelPhase?activeScenario.scenario.travelContext:activeScenario.scenario.context}
              </div>
              {(() => {
                const allChoices = travelPhase
                  ? (TRAVEL_CHOICES[activeScenario.scenario.travelChoices]||[])
                  : activeScenario.scenario.choices
                const pageSize = 3
                const pageChoices = allChoices.slice((choicePage-1)*pageSize, choicePage*pageSize)
                const hasMore = allChoices.length > choicePage * pageSize
                const hasPrev = choicePage > 1
                return (
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:7}}>
                      {pageChoices.map(ch=>(
                        <button key={ch.id} onClick={()=>makeChoice(ch)} style={{
                          background:`${ch.color}0d`,border:`0.5px solid ${ch.color}2a`,
                          borderRadius:10,padding:'11px 13px',color:'white',
                          cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.15s',
                        }}
                          onMouseEnter={e=>{e.currentTarget.style.background=`${ch.color}18`;e.currentTarget.style.borderColor=`${ch.color}55`}}
                          onMouseLeave={e=>{e.currentTarget.style.background=`${ch.color}0d`;e.currentTarget.style.borderColor=`${ch.color}2a`}}
                        >
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{ch.label}</div>
                              <div style={{fontSize:10,color:'rgba(255,255,255,0.38)'}}>{ch.sub}</div>
                            </div>
                            <div style={{display:'flex',flexDirection:'column',gap:2,flexShrink:0,alignItems:'flex-end'}}>
                              <span style={{fontSize:9,color:ch.energy>0?'#f5a623':'#ff5c5c',fontFamily:'monospace'}}>⚡{ch.energy>0?'+':''}{ch.energy}</span>
                              <span style={{fontSize:9,color:ch.money<0?'#ff5c5c':'#3ddc84',fontFamily:'monospace'}}>{currSym}{ch.money>0?'+':''}{ch.money}</span>
                              <span style={{fontSize:9,color:ch.carbon>100?'#ff2222':ch.carbon>5?'#ff5c5c':ch.carbon<=0.5?'#3ddc84':'#f5a623',fontFamily:'monospace'}}>🌿{ch.carbon>0?'+':''}{ch.carbon>=100?ch.carbon.toLocaleString():ch.carbon}kg</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,gap:8}}>
                      <div style={{display:'flex',gap:6}}>
                        {hasPrev&&<button onClick={()=>setChoicePage(p=>p-1)} style={{background:'rgba(255,255,255,0.06)',border:'0.5px solid rgba(255,255,255,0.12)',borderRadius:8,padding:'5px 12px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'inherit',fontSize:11}}>← Back</button>}
                        {hasMore&&<button onClick={()=>setChoicePage(p=>p+1)} style={{background:'rgba(255,255,255,0.06)',border:'0.5px solid rgba(255,255,255,0.12)',borderRadius:8,padding:'5px 12px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'inherit',fontSize:11}}>More options →</button>}
                      </div>
                      {!travelPhase&&<div style={{fontSize:10,color:'rgba(255,255,255,0.25)'}}>or close ✕ to move on without choosing</div>}
                    </div>
                  </>
                )
              })()}
            </>
          ):(
            <div style={{textAlign:'center',padding:'4px 0'}}>
              <div style={{fontSize:13,color:chosenResult.color,fontWeight:600,marginBottom:8}}>{chosenResult.label}</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.72)',lineHeight:1.7,fontStyle:'italic',marginBottom:14}}>"{chosenResult.consequence}"</div>
              <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:12}}>
                {[{l:'Energy',v:chosenResult.energy,c:'#f5a623',sym:'',u:'%'},{l:'Budget',v:chosenResult.money,c:'#5bbfff',sym:currSym,u:''},{l:'Carbon',v:chosenResult.carbon,c:'#ff5c5c',sym:'',u:' kg'}].map(({l,v,c,sym,u})=>(
                  <div key={l} style={{background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'8px 14px',textAlign:'center'}}>
                    <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',marginBottom:3}}>{l}</div>
                    <div style={{fontSize:16,fontWeight:700,fontFamily:'monospace',color:v<0?(l==='Carbon'?'#3ddc84':'#ff5c5c'):v>0?(l==='Carbon'?'#ff5c5c':c):'rgba(255,255,255,0.3)'}}>{v>0?'+':''}{sym}{v>=100?v.toLocaleString():v}{u}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                {!chosenResult.isTravelChoice&&(
                  <button onClick={()=>{setChosenResult(null);setChoicePage(1)}} style={{background:'rgba(255,255,255,0.07)',border:'0.5px solid rgba(255,255,255,0.15)',borderRadius:10,padding:'10px 24px',fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.7)',cursor:'pointer',fontFamily:'inherit'}}>
                    ← Another choice
                  </button>
                )}
                <button onClick={()=>{
                  if (chosenResult.isTravelChoice) confirmTravel()
                  else closeScenario()
                }} style={{background:cityColor,border:'none',borderRadius:10,padding:'10px 32px',fontSize:13,fontWeight:600,color:'#070b12',cursor:'pointer',fontFamily:'inherit'}}>
                  {chosenResult.isTravelChoice?"Arrived! See what to do here →":"Done, move on →"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes playerPulse{0%,100%{box-shadow:0 0 0 0 ${cityColor}44,0 4px 16px rgba(0,0,0,0.7)}50%{box-shadow:0 0 0 10px ${cityColor}00,0 4px 16px rgba(0,0,0,0.7)}}
        @keyframes floatUp{0%{opacity:0;transform:translate(-50%,-50%)scale(0.7)}15%{opacity:1;transform:translate(-50%,-65%)scale(1.1)}75%{opacity:1;transform:translate(-50%,-90%)scale(1)}100%{opacity:0;transform:translate(-50%,-120%)scale(0.85)}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes badgePop{from{transform:translateX(-50%)scale(0.5);opacity:0}to{transform:translateX(-50%)scale(1);opacity:1}}
        @keyframes particleSmoke{to{transform:translateY(-40px)scale(0.3);opacity:0}}
        @keyframes particleLeaf{to{transform:translateY(-35px)scale(0.4);opacity:0}}
        @keyframes phaseStripe{0%{background-position:0% 0}100%{background-position:200% 0}}
        @keyframes ecoLabelPulse{0%,100%{opacity:1}50%{opacity:0.7}}
        @keyframes dotBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.6)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      `}</style>
    </div>
  )
}

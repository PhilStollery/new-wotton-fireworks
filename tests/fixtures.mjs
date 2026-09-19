export function upstream({eventRemaining=3500, superRemaining=300, advanceRemaining=700, parkingRemaining=150}={}) {
  const activities=[
    {id:1,name:'# Event Capacity',capacity:3500,allocation_count:3500-eventRemaining},
    {id:2,name:'Release 1 - Super Saver',capacity:300,allocation_count:300-superRemaining},
    {id:3,name:'Release 2 - Advance',capacity:700,allocation_count:700-advanceRemaining},
    {id:4,name:'# Parking Capacity',capacity:150,allocation_count:150-parkingRemaining}
  ];
  const releases=[
    {slug:'super-adult',title:'Super Saver: Adult',price:6,activities:[activities[0],activities[1]]},
    {slug:'advance-adult',title:'Advance: Adult',price:8,activities:[activities[0],activities[2]]},
    {slug:'standard-adult',title:'Standard: Adult',price:10,activities:[activities[0]]},
    {slug:'preschool',title:'Pre-school',price:0,activities:[activities[0]]},
    {slug:'parking',title:'Paid Parking',price:10,activities:[activities[3]]},
    {slug:'blue-badge',title:'Blue Badge Parking',price:0,activities:[activities[3]]}
  ].map((r,i)=>({...r,id:i+1,position:i+1,quantity:null,tickets_count:0,allocatable:true}));
  return {activities,releases};
}

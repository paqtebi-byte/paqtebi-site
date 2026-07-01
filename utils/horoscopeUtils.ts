// Arrays of horoscope parts in Georgian.
const DAILY_PARTS_1 = [
  "დღეს თქვენი ენერგია განსაკუთრებით მაღალია.",
  "ინტუიცია ზუსტად გკარნახობთ სწორ გზას.",
  "დღეს შესაძლოა ახალი იდეები დაგებადოთ.",
  "მშვიდი და გაწონასწორებული დღე გელით.",
  "დღეს ყურადღების ცენტრში აღმოჩნდებით.",
  "პრაქტიკული საკითხების მოგვარებისთვის იდეალური დროა.",
  "დღეს ბალანსის პოვნა თქვენი მთავარი ამოცანა იქნება.",
  "მოულოდნელი ინფორმაცია ახალ პერსპექტივას გაგიხსნით."
];

const DAILY_PARTS_2 = [
  "ნუ შეგეშინდებათ რისკის გაწევის.",
  "დაუთმეთ დრო საყვარელ საქმეს.",
  "პირად ურთიერთობებში გულწრფელობა დაგეხმარებათ.",
  "ფინანსურ საკითხებში სიფრთხილე გამოიჩინეთ.",
  "არ აჩქარდეთ გადაწყვეტილებების მიღებისას.",
  "კარგი დროა ძველი საქმეების დასასრულებლად.",
  "ყურადღება მიაქციეთ დეტალებს.",
  "შეეცადეთ მეტი დრო გაატაროთ სუფთა ჰაერზე."
];

const DAILY_PARTS_3 = [
  "საღამოს სასიამოვნო სიურპრიზი გელით.",
  "დღის ბოლოს იგრძნობთ დამსახურებულ შვებას.",
  "მეგობრის რჩევა მნიშვნელოვან დახმარებას გაგიწევთ.",
  "ახალი ნაცნობობა შეიძლება ძალიან სასარგებლო აღმოჩნდეს.",
  "დაისვენეთ და აღიდგინეთ ძალები.",
  "მცირე ცვლილებებიც კი დიდ შედეგს მოგიტანთ.",
  "ნუ აიღებთ საკუთარ თავზე ზედმეტ პასუხისმგებლობას.",
  "წარმატება თქვენს მხარესაა."
];

const WEEKLY_PARTS_1 = [
  "ეს კვირა ახალი შესაძლებლობებით იქნება სავსე.",
  "კვირის განმავლობაში მნიშვნელოვანი ცვლილებებია მოსალოდნელი.",
  "პროფესიულ სფეროში წარმატების მიღწევის შანსი გეძლევათ.",
  "ეს კვირა შინაგან ბალანსს და სიმშვიდეს მოგიტანთ.",
  "კვირა დატვირთული, მაგრამ ნაყოფიერი იქნება.",
  "ურთიერთობებში სიცხადე და ჰარმონია დაისადგურებს.",
  "ფინანსური მდგომარეობის გაუმჯობესების პერსპექტივა ჩანს.",
  "ამ კვირაში შემოქმედებითი ენერგია პიკს მიაღწევს."
];

const WEEKLY_PARTS_2 = [
  "ფოკუსირდით მთავარ მიზნებზე და ნუ გაფანტავთ ყურადღებას.",
  "მოერიდეთ კონფლიქტებს კოლეგებთან თუ ოჯახის წევრებთან.",
  "ენდეთ საკუთარ ინტუიციას რთულ სიტუაციებში.",
  "იყავით ღია ახალი იდეებისა და თანამშრომლობისთვის.",
  "გამოყავით დრო დასვენებისა და ჰობისთვის.",
  "დაგეგმეთ მნიშვნელოვანი შეხვედრები კვირის პირველ ნახევარში.",
  "ნუ იჩქარებთ ფინანსური გადაწყვეტილებების მიღებას.",
  "შეინარჩუნეთ პოზიტიური განწყობა ნებისმიერ სიტუაციაში."
];

const WEEKLY_PARTS_3 = [
  "კვირის ბოლოს შეძლებთ დაისვენოთ და გაერთოთ.",
  "შაბათ-კვირა იდეალურია ოჯახთან ერთად გასატარებლად.",
  "მოულოდნელი შეხვედრა სასიამოვნო ემოციებით აგავსებთ.",
  "შრომა აუცილებლად დაგიფასდებათ.",
  "ახალი კვირა ახალ ძალებსა და მოტივაციას მოგიტანთ.",
  "ჯანმრთელობას მეტი ყურადღება დაუთმეთ.",
  "მნიშვნელოვანი გადაწყვეტილებების მიღება გაგიადვილდებათ.",
  "მალე ნახავთ თქვენი ძალისხმევის რეალურ შედეგებს."
];

function getPseudoRandomIndex(seedStr: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0; 
  }
  return Math.abs(hash) % max;
}

export function generateDynamicHoroscope(signName: string, type: 'daily' | 'weekly'): string {
  const now = new Date();
  
  let timeSeed = "";
  if (type === 'daily') {
    timeSeed = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  } else {
    // Basic week generator
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    timeSeed = `${now.getFullYear()}-W${weekNumber}`;
  }
  
  const seed1 = `${signName}-${timeSeed}-1`;
  const seed2 = `${signName}-${timeSeed}-2`;
  const seed3 = `${signName}-${timeSeed}-3`;

  if (type === 'daily') {
    const part1 = DAILY_PARTS_1[getPseudoRandomIndex(seed1, DAILY_PARTS_1.length)];
    const part2 = DAILY_PARTS_2[getPseudoRandomIndex(seed2, DAILY_PARTS_2.length)];
    const part3 = DAILY_PARTS_3[getPseudoRandomIndex(seed3, DAILY_PARTS_3.length)];
    return `${part1} ${part2} ${part3}`;
  } else {
    const part1 = WEEKLY_PARTS_1[getPseudoRandomIndex(seed1, WEEKLY_PARTS_1.length)];
    const part2 = WEEKLY_PARTS_2[getPseudoRandomIndex(seed2, WEEKLY_PARTS_2.length)];
    const part3 = WEEKLY_PARTS_3[getPseudoRandomIndex(seed3, WEEKLY_PARTS_3.length)];
    return `${part1} ${part2} ${part3}`;
  }
}

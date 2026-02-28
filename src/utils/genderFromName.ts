// Common first names — used to guess character gender for voice auto-assignment.
// Covers the most common English theatrical/TV character names.

const FEMALE_NAMES = new Set([
  'abigail','ada','adele','adriana','agatha','agnes','aisha','alex','alexa',
  'alexandra','alexis','alice','alicia','alison','allison','alyssa','amanda',
  'amber','amelia','amy','ana','anastasia','andrea','angela','angelica','ann',
  'anna','anne','annette','annie','aphrodite','april','aria','ariana','ariel',
  'ashley','audrey','aurora','ava','barbara','beatrice','bella','beth','betty',
  'beverly','bianca','bonnie','brenda','bridget','brittany','brooke','camille',
  'carmen','carol','carolina','caroline','cassandra','cassie','catherine',
  'cathy','cecilia','celeste','charlotte','chelsea','cheryl','chloe','christy',
  'cindy','claire','clara','claudia','cleo','clementine','colette','connie',
  'crystal','daisy','dana','daniela','danielle','dawn','deborah','debra',
  'diana','donna','dorothy','elena','eleanor','eliza','elizabeth','ella',
  'ellie','emily','emma','erica','erin','eva','eve','evelyn','faith','fiona',
  'florence','francesca','gabrielle','gemma','georgia','gillian','gina',
  'grace','greta','hannah','harriet','heather','helen','holly','hope','ida',
  'ilona','imogen','iris','isabel','isabella','ivy','jackie','jacqueline',
  'jade','jane','janet','jennifer','jessica','joan','joanna','jody','josephine',
  'joy','julia','juliet','june','karen','kate','katherine','katie','kelly',
  'kim','kimberly','kristen','kristina','laura','lauren','layla','lea','leah',
  'leslie','lillian','lily','linda','lisa','liz','lola','lorraine','louise',
  'lucia','lucy','lydia','madeleine','maggie','margaret','maria','marie',
  'marilyn','martha','mary','maya','megan','melanie','melissa','mia','michelle',
  'miranda','molly','monica','morgan','nancy','natasha','natalie','nicole',
  'nina','nora','norma','olivia','pamela','patricia','paula','penny','petra',
  'rachel','rebecca','renee','rita','rosa','rose','ruby','ruth','sabrina',
  'sally','samantha','sandra','sara','sarah','savannah','serena','shannon',
  'sharon','sheila','sierra','silvia','simone','sofia','sophia','sophie',
  'stella','stephanie','sue','summer','susan','sylvia','tara','taylor','tina',
  'tracy','valerie','vanessa','vera','veronica','victoria','violet','virginia',
  'vivian','wendy','zoe','zoey',
]);

const MALE_NAMES = new Set([
  'aaron','adam','alan','albert','alex','alexander','alfred','andrew','andy',
  'anthony','antonio','arthur','austin','ben','benjamin','bob','brandon',
  'brian','bruce','bryan','carl','carlos','charles','charlie','chris',
  'christian','christopher','clark','colin','connor','cory','daniel','dave',
  'david','dennis','derek','dominic','donald','douglas','drew','dylan',
  'edward','eli','eric','ethan','evan','felix','frank','fred','gabriel',
  'gary','george','grant','greg','harvey','henry','ian','isaac','jack',
  'jacob','james','jason','jay','jeff','jeffrey','jeremy','joel','john',
  'jonathan','jordan','joseph','josh','joshua','julian','justin','kevin',
  'kyle','lance','larry','leo','leon','liam','logan','louis','lucas','luke',
  'marcus','mark','martin','matt','matthew','max','michael','mike','miles',
  'nathan','neil','nicholas','nick','noah','oliver','oscar','patrick',
  'paul','peter','philip','ray','richard','rick','robert','ryan','samuel',
  'scott','sean','simon','stephen','steven','thomas','tim','timothy','tom',
  'tony','trevor','troy','tyler','victor','vincent','walter','will','william',
  'xavier','zachary','zach',
]);

/** Guess gender from a character name (first word, lowercased). */
export function guessGender(characterName: string): 'male' | 'female' | 'unknown' {
  const first = characterName.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
  if (FEMALE_NAMES.has(first)) return 'female';
  if (MALE_NAMES.has(first)) return 'male';
  return 'unknown';
}

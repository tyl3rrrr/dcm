// /appearence – server-specific bot appearance.
//
// Discord's official Display Name Styles (font/effect/color) are a Nitro
// profile feature and there is no supported bot API for applying those exact
// profile styles. This implementation therefore uses the supported Discord
// mechanisms that ARE visible on a server:
//   • guild nickname -> Unicode font simulation + effect decoration
//   • a real guild role color -> actual bot-name color in the guild
//   • optional custom server nickname
// The settings are stored per guild.

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const storage = require('./storage');
const config = require('./config');
const { ACCESS, requireAccess } = require('./permissions');

const FONTS = [
  ['ggsans', 'gg sans'], ['bold', 'Bold'], ['italic', 'Italic'],
  ['bolditalic', 'Bold Italic'], ['script', 'Script'], ['fraktur', 'Fraktur'],
  ['double', 'Double'], ['mono', 'Monospace'], ['circled', 'Circled'],
  ['squared', 'Squared'], ['fullwidth', 'Fullwidth'], ['smallcaps', 'Small Caps'],
];
const EFFECTS = [
  ['solid', 'Stabil'], ['gradient', 'Farbverlauf'], ['neon', 'Neon'],
  ['toon', 'Toon'], ['pop', 'Pop'], ['gummy', 'Gummi'], ['prism', 'Prisma'],
];
const COLORS = [
  ['default', 'Standard', '#5865F2'], ['mint', 'Mint', '#62D5B2'],
  ['green', 'Grün', '#66DC78'], ['blue', 'Blau', '#4B95DC'],
  ['purple', 'Lila', '#B13CE8'], ['pink', 'Pink', '#E93B70'],
  ['gold', 'Gold', '#C9AA3B'], ['teal', 'Türkis', '#48A07E'],
  ['forest', 'Waldgrün', '#4DB15C'], ['deepblue', 'Dunkelblau', '#3676AE'],
  ['violet', 'Violett', '#9824D8'], ['red', 'Rot', '#E84632'],
];

const FONT_MAPS = {
  bold: { upper:'𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭', lower:'𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇' },
  italic: { upper:'𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡', lower:'𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻' },
  bolditalic: { upper:'𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕', lower:'𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯' },
  script: { upper:'𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵', lower:'𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏' },
  fraktur: { upper:'𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ', lower:'𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷' },
  double: { upper:'𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ', lower:'𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫' },
  mono: { upper:'𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉', lower:'𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣' },
};
const SMALL_CAPS = {a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'};
const EFFECT_PREFIX = {
  solid:['',''], gradient:['◢ ',' ◣'], neon:['✦ ',' ✦'], toon:['◉ ',' ◉'],
  pop:['‹ ',' ›'], gummy:['● ',' ●'], prism:['◇ ',' ◇'],
};

function getAppearance(guildId) {
  return storage.getGuildSettings(guildId).appearance || {
    name: null, font:'ggsans', effect:'solid', color:'default', customColor:null,
    colorRoleId:null,
  };
}
function saveAppearance(guildId, patch) {
  const next={...getAppearance(guildId),...patch};
  storage.setGuildSetting(guildId,'appearance',next);
  return next;
}
function label(items,key){return items.find(([id])=>id===key)?.[1]||key;}
function colorHex(s){return s.customColor || COLORS.find(([id])=>id===s.color)?.[2] || '#5865F2';}
function styleUnicode(text,font){
  if(font==='ggsans') return text;
  if(font==='smallcaps') return [...text].map(ch=>SMALL_CAPS[ch.toLowerCase()]||ch).join('');
  if(font==='fullwidth') return text.replace(/[!-~]/g,ch=>String.fromCharCode(ch.charCodeAt(0)+0xfee0));
  if(font==='circled') return [...text].map(ch=>{const c=ch.toUpperCase().charCodeAt(0);return c>=65&&c<=90?String.fromCodePoint(0x24b6+c-65):ch;}).join('');
  if(font==='squared') return [...text].map(ch=>{const c=ch.toUpperCase().charCodeAt(0);return c>=65&&c<=90?String.fromCodePoint(0x1f130+c-65):ch;}).join('');
  const map=FONT_MAPS[font]; if(!map) return text;
  const upper='ABCDEFGHIJKLMNOPQRSTUVWXYZ',lower='abcdefghijklmnopqrstuvwxyz';
  return [...text].map(ch=>{const a=upper.indexOf(ch),b=lower.indexOf(ch);return a>=0?[...map.upper][a]||ch:b>=0?[...map.lower][b]||ch:ch;}).join('');
}
function styleNickname(base,s){
  const plain=String(base||'tylxrrrr').replace(/[\u0000-\u001F]/g,'').slice(0,32);
  const styled=styleUnicode(plain,s.font), [pre,post]=EFFECT_PREFIX[s.effect]||['',''];
  return `${pre}${styled}${post}`.slice(0,32).trim();
}
async function ensureColorRole(guild,s){
  const me=await guild.members.fetchMe().catch(()=>null);
  if(!me) throw new Error('Bot-Mitglied konnte nicht geladen werden.');
  const hex=colorHex(s);
  if(!me.permissions.has('ManageRoles')) throw new Error('Bot benötigt Manage Roles für die echte Name-Farbe.');
  let role=s.colorRoleId ? guild.roles.cache.get(s.colorRoleId) : null;
  if(!role) role=guild.roles.cache.find(r=>r.name==='Tylxrrrr Appearance' && !r.managed);
  if(!role) role=await guild.roles.create({name:'Tylxrrrr Appearance',color:hex,hoist:false,mentionable:false,reason:'Tylxrrrr v8.2 Appearance'});
  if(role.managed) throw new Error('Die vorhandene Appearance-Rolle ist managed und kann nicht bearbeitet werden.');
  if(role.position>=me.roles.highest.position) throw new Error('Die Appearance-Rolle muss unter der höchsten Bot-Rolle liegen.');
  await role.edit({color:hex,reason:'Tylxrrrr v8.2 Appearance Farbe'});
  if(!me.roles.cache.has(role.id)) await me.roles.add(role,'Tylxrrrr v8.2 Appearance');
  saveAppearance(guild.id,{colorRoleId:role.id});
  return role;
}
async function applyAppearance(guild,s){
  const me=await guild.members.fetchMe();
  const base=s.name || guild.client.user.username || 'tylxrrrr';
  const nickname=styleNickname(base,s);
  if(me.manageable) await me.setNickname(nickname,'Tylxrrrr v8.2 Appearance');
  const role=await ensureColorRole(guild,s);
  return {nickname,role};
}
function buildEmbed(guild){
  const s=getAppearance(guild.id),hex=colorHex(s);
  return new EmbedBuilder().setTitle('🎨 Appearance').setColor(parseInt(hex.slice(1),16)).setThumbnail(guild.client.user.displayAvatarURL({size:256}))
    .setDescription(`**Name:** ${s.name || guild.client.user.username}\n**Font:** ${label(FONTS,s.font)}\n**Effekt:** ${label(EFFECTS,s.effect)}\n**Farbe:** ${s.customColor || label(COLORS,s.color)}\n\n**Serverseitig angewendet:** Der Bot-Nickname wird mit Unicode-Font/Effect dargestellt und die Farbe wird über eine echte Discord-Rolle gesetzt.`)
    .setFooter({text:'v8.2 · /appearence gilt nur für diesen Server'});
}
function components(guild){
  const s=getAppearance(guild.id);
  const font=new StringSelectMenuBuilder().setCustomId('appearance:font').setPlaceholder(`Font · ${label(FONTS,s.font)}`).addOptions(FONTS.map(([v,n])=>({label:n,value:v,default:s.font===v})));
  const effect=new StringSelectMenuBuilder().setCustomId('appearance:effect').setPlaceholder(`Effekt · ${label(EFFECTS,s.effect)}`).addOptions(EFFECTS.map(([v,n])=>({label:n,value:v,default:s.effect===v})));
  const color=new StringSelectMenuBuilder().setCustomId('appearance:color').setPlaceholder(`Farbe · ${s.customColor||label(COLORS,s.color)}`).addOptions(COLORS.map(([v,n])=>({label:n,value:v,default:!s.customColor&&s.color===v})));
  return [
    new ActionRowBuilder().addComponents(font),new ActionRowBuilder().addComponents(effect),new ActionRowBuilder().addComponents(color),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('appearance:name').setLabel('Name').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('appearance:custom-color').setLabel('Eigene Farbe').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('appearance:apply').setLabel('Anwenden').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('appearance:reset').setLabel('Reset').setStyle(ButtonStyle.Danger),
    ),
  ];
}

const appearence={
  data:new SlashCommandBuilder().setName('appearence').setDescription('Bot-Name, Font, Effekt und Farbe für diesen Server einstellen').setDefaultMemberPermissions(0).setDMPermission(false),
  async execute(i){
    if(!await requireAccess(i,ACCESS.ADMIN)) return;
    await i.reply({embeds:[buildEmbed(i.guild)],components:components(i.guild),ephemeral:true});
  },
};

async function handleAppearanceComponent(i){
  if(!i.guild || (!i.isStringSelectMenu()&&!i.isButton()&&!i.isModalSubmit())) return false;
  if(!i.customId.startsWith('appearance:')) return false;
  if(!await requireAccess(i,ACCESS.ADMIN)) return true;
  const gid=i.guild.id;
  const current=getAppearance(gid);
  if(i.isStringSelectMenu()){
    const type=i.customId.split(':')[1],value=i.values[0];
    if(type==='font'&&FONTS.some(([id])=>id===value)) saveAppearance(gid,{font:value});
    if(type==='effect'&&EFFECTS.some(([id])=>id===value)) saveAppearance(gid,{effect:value});
    if(type==='color'&&COLORS.some(([id])=>id===value)) saveAppearance(gid,{color:value,customColor:null});
    const next=getAppearance(gid);
    try{await applyAppearance(i.guild,next);await i.update({embeds:[buildEmbed(i.guild)],components:components(i.guild)});}
    catch(e){await i.update({embeds:[buildEmbed(i.guild)],components:components(i.guild)});await i.followUp({content:`⚠️ Einstellung gespeichert, aber konnte nicht vollständig angewendet werden: ${e.message}`,ephemeral:true}).catch(()=>{});}
    return true;
  }
  if(i.isButton()&&i.customId==='appearance:apply'){
    try{const result=await applyAppearance(i.guild,current);await i.update({embeds:[buildEmbed(i.guild)],components:components(i.guild)});await i.followUp({content:`✅ Appearance angewendet. Name: **${result.nickname}** · Farbe: **${current.customColor||label(COLORS,current.color)}**`,ephemeral:true});}
    catch(e){await i.reply({content:`❌ Appearance konnte nicht vollständig angewendet werden: ${e.message}`,ephemeral:true});}
    return true;
  }
  if(i.isButton()&&i.customId==='appearance:reset'){
    const next=saveAppearance(gid,{name:null,font:'ggsans',effect:'solid',color:'default',customColor:null});
    try{await applyAppearance(i.guild,next);await i.update({embeds:[buildEmbed(i.guild)],components:components(i.guild)});}catch(e){await i.update({embeds:[buildEmbed(i.guild)],components:components(i.guild)});await i.followUp({content:`⚠️ Reset gespeichert, aber nicht vollständig angewendet: ${e.message}`,ephemeral:true}).catch(()=>{});}
    return true;
  }
  if(i.isButton()&&(i.customId==='appearance:name'||i.customId==='appearance:custom-color')){
    const modal=new ModalBuilder().setCustomId(i.customId==='appearance:name'?'appearance:name-modal':'appearance:custom-color-modal').setTitle(i.customId==='appearance:name'?'Bot-Name auf diesem Server':'Eigene Farbe');
    const input=new TextInputBuilder().setCustomId('value').setLabel(i.customId==='appearance:name'?'Server-Nickname (max. 32 Zeichen)':'HEX-Farbe, z.B. #E87D35').setPlaceholder(i.customId==='appearance:name'?'sweep':'#E87D35').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32);
    modal.addComponents(new ActionRowBuilder().addComponents(input)); await i.showModal(modal); return true;
  }
  if(i.isModalSubmit()&&i.customId==='appearance:name-modal'){
    const value=i.fields.getTextInputValue('value').trim();
    if(!value||value.length>32){await i.reply({content:'❌ Der Name muss 1–32 Zeichen lang sein.',ephemeral:true});return true;}
    saveAppearance(gid,{name:value});
    try{await applyAppearance(i.guild,getAppearance(gid));}catch(e){await i.reply({content:`⚠️ Name gespeichert, aber konnte nicht gesetzt werden: ${e.message}`,ephemeral:true});return true;}
    await i.reply({embeds:[buildEmbed(i.guild)],components:components(i.guild),ephemeral:true}); return true;
  }
  if(i.isModalSubmit()&&i.customId==='appearance:custom-color-modal'){
    const value=i.fields.getTextInputValue('value').trim();
    if(!/^#[0-9a-fA-F]{6}$/.test(value)){await i.reply({content:'❌ Ungültige HEX-Farbe.',ephemeral:true});return true;}
    saveAppearance(gid,{color:'custom',customColor:value.toUpperCase()});
    try{await applyAppearance(i.guild,getAppearance(gid));}catch(e){await i.reply({content:`⚠️ Farbe gespeichert, aber konnte nicht gesetzt werden: ${e.message}`,ephemeral:true});return true;}
    await i.reply({embeds:[buildEmbed(i.guild)],components:components(i.guild),ephemeral:true}); return true;
  }
  return true;
}
module.exports={appearence,handleAppearanceComponent,FONTS,EFFECTS,COLORS,getAppearance,applyAppearance};

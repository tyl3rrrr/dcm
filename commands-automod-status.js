// Official Discord AutoMod manager.
// /automod-status setup-all reconciles the bot-owned AutoMod rules on every
// guild. The target is the Discord-per-guild maximum of 10 rules:
// 6 KEYWORD + 1 SPAM + 1 KEYWORD_PRESET + 1 MENTION_SPAM + 1 MEMBER_PROFILE.

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { ACCESS, requireAccess } = require('./permissions');
const config = require('./config');
const { getBannedWords } = require('./automod-filter');

const EVENT_MESSAGE_SEND = 1;
const EVENT_MEMBER_UPDATE = 2;
const TRIGGER_KEYWORD = 1;
const TRIGGER_SPAM = 3;
const TRIGGER_KEYWORD_PRESET = 4;
const TRIGGER_MENTION_SPAM = 5;
const TRIGGER_MEMBER_PROFILE = 6;
const ACTION_BLOCK_MESSAGE = 1;
const ACTION_BLOCK_MEMBER_INTERACTION = 4;

const MANAGED = {
  keywords: i => `tylxrrrr-v82-keywords-${i}`,
  spam: 'tylxrrrr-v82-spam',
  profanity: 'tylxrrrr-v82-profanity',
  mention: 'tylxrrrr-v82-mention-spam',
  profile: 'tylxrrrr-v82-member-profile',
};

const FALLBACK_KEYWORDS = [
  'scam', 'phishing', 'free nitro', 'discord gift', 'account steal', 'credential',
];

async function fetchRules(guild) {
  return guild.autoModerationRules.fetch();
}
function managedRule(rules, name) { return rules.find(r => r.name === name); }
function keywordChunks(words) {
  const clean = [...new Set(words.map(String).map(x => x.trim()).filter(Boolean))]
    .filter(x => x.length <= 60);
  const merged = [...clean];
  for (const word of FALLBACK_KEYWORDS) if (merged.length < 6 && !merged.includes(word)) merged.push(word);
  while (merged.length < 6) merged.push(`tylxrrrr-filter-${merged.length + 1}`);
  const chunks = Array.from({length: 6}, () => []);
  merged.slice(0, 100).forEach((word, index) => chunks[index % 6].push(word));
  // Spread additional words across the six rules, respecting Discord's 100
  // keyword limit per KEYWORD rule.
  merged.slice(6, 600).forEach((word, index) => {
    const bucket = index % 6;
    if (chunks[bucket].length < 100) chunks[bucket].push(word);
  });
  return chunks;
}

async function upsertRule(guild, rules, name, payload, reason) {
  const existing = managedRule(rules, name);
  try {
    if (existing) {
      const updated = await existing.edit({
        eventType: payload.eventType,
        triggerMetadata: payload.triggerMetadata,
        actions: payload.actions,
        enabled: true,
        reason,
      });
      return { rule: updated, action: 'updated' };
    }
    const created = await guild.autoModerationRules.create({ ...payload, enabled: true, reason });
    return { rule: created, action: 'created' };
  } catch (error) {
    return { error };
  }
}

async function setupOfficialAutoMod(guild) {
  const me = await guild.members.fetchMe().catch(() => null);
  if (!me?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
    return { created: [], updated: [], skipped: [], errors: ['Bot besitzt nicht MANAGE_GUILD.'], total: 0, enabled: 0 };
  }

  const rules = await fetchRules(guild);
  const created = [], updated = [], skipped = [], errors = [];
  const reason = 'Tylxrrrr v8.2 – offizielle Discord AutoMod-Konfiguration';
  const chunks = keywordChunks(getBannedWords(guild.id));

  for (let i = 0; i < 6; i++) {
    const name = MANAGED.keywords(i + 1);
    const result = await upsertRule(guild, rules, name, {
      name,
      eventType: EVENT_MESSAGE_SEND,
      triggerType: TRIGGER_KEYWORD,
      triggerMetadata: { keywordFilter: chunks[i] },
      actions: [{ type: ACTION_BLOCK_MESSAGE, metadata: { customMessage: 'Diese Nachricht wurde durch den offiziellen Discord AutoMod blockiert.' } }],
    }, reason);
    if (result.error) errors.push(`${name}: ${result.error.message}`);
    else if (result.action === 'created') created.push(result.rule);
    else updated.push(result.rule);
  }

  const generic = [
    {
      name: MANAGED.spam,
      eventType: EVENT_MESSAGE_SEND,
      triggerType: TRIGGER_SPAM,
      actions: [{ type: ACTION_BLOCK_MESSAGE, metadata: { customMessage: 'Diese Nachricht wurde als Spam erkannt.' } }],
    },
    {
      name: MANAGED.profanity,
      eventType: EVENT_MESSAGE_SEND,
      triggerType: TRIGGER_KEYWORD_PRESET,
      triggerMetadata: { presets: [1] },
      actions: [{ type: ACTION_BLOCK_MESSAGE, metadata: { customMessage: 'Diese Nachricht wurde durch Discord AutoMod blockiert.' } }],
    },
    {
      name: MANAGED.mention,
      eventType: EVENT_MESSAGE_SEND,
      triggerType: TRIGGER_MENTION_SPAM,
      triggerMetadata: { mentionTotalLimit: 5, mentionRaidProtectionEnabled: true },
      actions: [{ type: ACTION_BLOCK_MESSAGE, metadata: { customMessage: 'Zu viele Erwähnungen in einer Nachricht.' } }],
    },
    {
      name: MANAGED.profile,
      eventType: EVENT_MEMBER_UPDATE,
      triggerType: TRIGGER_MEMBER_PROFILE,
      triggerMetadata: { keywordFilter: ['free nitro', 'discord gift', 'phishing', 'scam'] },
      actions: [{ type: ACTION_BLOCK_MEMBER_INTERACTION }],
    },
  ];

  for (const payload of generic) {
    const result = await upsertRule(guild, rules, payload.name, payload, reason);
    if (result.error) errors.push(`${payload.name}: ${result.error.message}`);
    else if (result.action === 'created') created.push(result.rule);
    else updated.push(result.rule);
  }

  const after = await fetchRules(guild).catch(() => null);
  const all = after ? [...after.values()] : [...rules.values()];
  const botRules = all.filter(r => r.name.startsWith('tylxrrrr-v82-'));
  const enabled = botRules.filter(r => r.enabled).length;
  return { created, updated, skipped, errors, total: botRules.length, enabled, allRules: all.length };
}

const automodStatus = {
  data: new SlashCommandBuilder()
    .setName('automod-status')
    .setDescription('Zeigt und verwaltet echte Discord-AutoMod-Regeln')
    .setDMPermission(false)
    .addSubcommand(s => s.setName('status').setDescription('Zeigt offizielle AutoMod-Regeln'))
    .addSubcommand(s => s.setName('setup').setDescription('Aktiviert die 10 möglichen Bot-AutoMod-Regeln auf diesem Server'))
    .addSubcommand(s => s.setName('setup-all').setDescription('Aktiviert die Bot-AutoMod-Regeln auf allen Servern (Superuser)')),

  async execute(i) {
    if (!await requireAccess(i, ACCESS.ADMIN)) return;
    const sub = i.options.getSubcommand();

    if (sub === 'setup-all') {
      if (i.user.id !== config.superuserId) {
        await i.reply({ content: '❌ Nur der konfigurierte Superuser darf AutoMod auf allen Servern einrichten.', ephemeral: true });
        return;
      }
      await i.deferReply({ ephemeral: true });
      const lines = [];
      let created = 0, updated = 0, enabled = 0;
      for (const guild of i.client.guilds.cache.values()) {
        const result = await setupOfficialAutoMod(guild);
        created += result.created.length;
        updated += result.updated.length;
        enabled += result.enabled;
        const state = result.errors.length ? '⚠️' : (result.enabled === 10 ? '✅' : '⚠️');
        lines.push(`${state} **${guild.name}** — ${result.enabled}/10 aktiv · +${result.created.length} neu · ${result.updated.length} aktualisiert${result.errors.length ? ` · ${result.errors.length} Fehler` : ''}`);
      }
      await i.editReply({ embeds: [new EmbedBuilder().setTitle('🛡️ Offizieller Discord AutoMod – Setup All').setColor(0x57f287)
        .setDescription(`**${enabled}** bot-eigene AutoMod-Regeln sind nach dem Durchlauf aktiv.\n**${created}** neu erstellt · **${updated}** aktualisiert.\n\n${lines.join('\n').slice(0, 3900)}`)] });
      return;
    }

    if (sub === 'setup') {
      await i.deferReply({ ephemeral: true });
      const result = await setupOfficialAutoMod(i.guild);
      const ok = result.enabled === 10 && result.errors.length === 0;
      await i.editReply({ embeds: [new EmbedBuilder().setTitle('🛡️ Discord AutoMod Setup').setColor(ok ? 0x57f287 : 0xfee75c)
        .setDescription(`**${result.enabled}/10** der vom Bot verwalteten offiziellen AutoMod-Regeln sind aktiv.\n\nDiscord erzwingt die Limits pro Trigger-Typ. Wenn bereits fremde Regeln die Limits belegen, kann der Bot keine zusätzliche Regel derselben Art erzeugen.`)
        .addFields(
          { name:'Neu', value:String(result.created.length), inline:true },
          { name:'Aktualisiert', value:String(result.updated.length), inline:true },
          { name:'Aktiv', value:`${result.enabled}/10`, inline:true },
          { name:'Fehler', value:result.errors.join('\n').slice(0,1024)||'Keine', inline:false },
        )] });
      return;
    }

    await i.deferReply({ ephemeral: true });
    const rules = await fetchRules(i.guild).catch(() => null);
    if (!rules) { await i.editReply('❌ Die offiziellen AutoMod-Regeln konnten nicht abgerufen werden.'); return; }
    const all = [...rules.values()];
    const active = all.filter(r => r.enabled).length;
    const mine = all.filter(r => r.name.startsWith('tylxrrrr-v82-'));
    await i.editReply({ embeds: [new EmbedBuilder().setTitle('🛡️ Discord AutoMod Status').setColor(mine.filter(r=>r.enabled).length === 10 ? 0x57f287 : 0xfee75c)
      .setDescription(`Dieser Server hat **${all.length}** offizielle AutoMod-Regeln, davon **${active}** aktiv.\nBot-eigene Regeln: **${mine.filter(r=>r.enabled).length}/10 aktiv**.`)
      .addFields({name:'Bot-Regeln',value:mine.map(r=>`${r.enabled?'🟢':'🔴'} ${r.name}`).join('\n').slice(0,1024)||'Noch keine',inline:false})] });
  },
};

module.exports = { automodStatus, setupOfficialAutoMod };

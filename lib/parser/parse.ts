import type {
  Advertiser,
  Connection,
  CoverageEntry,
  ExportModel,
  LikedComment,
  AccountEvent,
  DownloadRequest,
  ExpiredApp,
  NoteInteraction,
  LikedPost,
  LinkVisit,
  OwnMedia,
  OwnMediaKind,
  ParseProgress,
  Profile,
  ProfileChange,
  SavedPost,
  SavedTrack,
  SearchRecord,
  SessionEvent,
  SignupDetails,
  StoredField,
  MessageKind,
  FullExport,
  Thread,
  ThreadFolder,
  ThreadMessage,
  ThreadSummary,
  SuggestedProfile,
  StoryAnswer,
  StoryAnswerKind,
  StoryEvent,
  SyncedContact,
  WrittenComment
} from "@/lib/parser/model";
import {
  readHashtags,
  readLabels,
  readMap,
  readMapTimestamp,
  readNestedGroup,
  readOwner,
  readVector,
  type LabelRecord,
  type MapRecord
} from "@/lib/parser/shapes";
import { decodeReaction, demojibake, normalizeEmoji } from "@/lib/parser/text";
import type { ExportSource } from "@/lib/parser/source";

const CONNECTION_LISTS = [
  ["pendingOut", "pending_follow_requests", "Requests you sent, unanswered"],
  ["pendingIn", "follow_requests_you_ve_received", "Requests waiting on you"],
  ["recentRequests", "recent_follow_requests", "Recent requests you sent"],
  ["unfollowed", "recently_unfollowed_profiles", "Accounts you unfollowed"],
  ["blocked", "blocked_profiles", "Blocked accounts"],
  ["closeFriends", "close_friends", "Close friends"],
  ["restricted", "restricted_profiles", "Restricted accounts"]
] as const;

export class ExportFormatError extends Error {}

function breathe(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export async function parseExport(
  source: ExportSource,
  onProgress: (progress: ParseProgress) => void
): Promise<FullExport> {
  if (source.looksLikeHtmlExport) {
    throw new ExportFormatError(
      "This is an HTML export. Request your data again from Instagram and choose JSON."
    );
  }
  if (source.size === 0) {
    throw new ExportFormatError("No Instagram JSON files were found in that folder.");
  }

  const coverage: CoverageEntry[] = [];
  const track = (label: string, file: string, records: number, found: boolean) => {
    coverage.push({ label, file, records, found });
  };
  const report = async (percent: number, message: string) => {
    onProgress({
      percent,
      message,
      files: coverage.length,
      records: coverage.reduce((sum, entry) => sum + entry.records, 0)
    });
    await breathe();
  };

  await report(6, "Reading your profile");
  const profile = await readProfile(source);

  await report(14, "Reading followers and following");
  const followers = await readFollowers(source);
  track(
    "Followers",
    "followers_*.json",
    followers.length,
    source.findAll(/followers_\d+\.json$/).length > 0
  );

  const following = await readFollowing(source);
  track(
    "Following",
    "following.json",
    following.length,
    source.find("following.json") !== undefined
  );

  await report(24, "Reading follow requests and lists");
  const lists = {} as Record<(typeof CONNECTION_LISTS)[number][0], Connection[]>;
  for (const [key, file, label] of CONNECTION_LISTS) {
    const found = source.find(`followers_and_following/${file}.json`);
    const rows = await source.readJson<LabelRecord[]>(found);
    lists[key] = (rows ?? []).map(toConnection).filter((row) => row.username.length > 0);
    track(label, `${file}.json`, lists[key].length, found !== undefined);
  }

  await report(34, "Reading synced contacts");
  const contacts = await readContacts(source, track);

  await report(48, "Reading your likes");
  const likedPosts = await readLikedPosts(source, track);
  const likedComments = await readLikedComments(source, track);

  await report(62, "Reading story activity");
  const storyViews = await readStoryEvents(source, "stories_viewed", "Stories you watched", track);
  const storyLikes = await readStoryEvents(source, "story_likes", "Stories you liked", track);

  const storyAnswers = await readStoryAnswers(source, track);

  await report(70, "Reading your comments");
  const comments = await readComments(source, track);

  await report(76, "Reading saved posts");
  const saved = await readSaved(source, track);

  await report(84, "Reading login history");
  const logins = await readSessions(source, "login", track);
  const logouts = await readSessions(source, "logout", track);
  const profileSessions = await readProfileSessions(source, track);
  const accountEvents = await readAccountEvents(source, track);
  const signup = await readSignup(source, track);
  const profileChanges = await readProfileChanges(source, track);
  const storedAbout = await readStoredAbout(source, track);
  const autofill = await readAutofill(source, track);
  const searches = await readSearches(source, track);
  const downloadRequests = await readDownloadRequests(source, track);
  const noteInteractions = await readNoteInteractions(source, track);

  await report(92, "Reading advertisers and tracking");
  const advertisers = await readAdvertisers(source, track);
  const adCategories = await readAdCategories(source, track);
  const linkHistory = await readLinkHistory(source, track);
  const suggestedProfiles = await readSuggestedProfiles(source, track);
  const expiredApps = await readExpiredApps(source, track);

  await report(97, "Reading your posts and stories");
  const ownMedia = await readOwnMedia(source, track);
  const savedMusic = await readSavedMusic(source, track);
  const savedCollections = await readSavedCollections(source, track);

  await report(98, "Reading your conversations");
  const threads = await readThreads(source, track);

  await report(100, "Building the joins");

  const model: ExportModel = {
    profile,
    followers,
    following,
    ...lists,
    likedPosts,
    likedComments,
    storyViews,
    storyLikes,
    storyAnswers,
    comments,
    saved,
    logins,
    logouts,
    profileSessions,
    accountEvents,
    signup,
    profileChanges,
    storedAbout,
    autofill,
    searches,
    downloadRequests,
    noteInteractions,
    advertisers,
    adCategories,
    contacts,
    linkHistory,
    suggestedProfiles,
    expiredApps,
    ownMedia,
    savedMusic,
    savedCollections,
    threads: threads.map(summarize),
    coverage
  };

  if (
    !coverage.some((row) => row.found) &&
    source.find("personal_information/personal_information.json") === undefined
  ) {
    throw new ExportFormatError(
      "No supported Instagram files were found. Choose your complete JSON export folder."
    );
  }
  return { model, threads };
}

function summarize(thread: Thread): ThreadSummary {
  return {
    id: thread.id,
    title: thread.title,
    folder: thread.folder,
    participants: thread.participants,
    messages: thread.messages.length
  };
}

type Track = (label: string, file: string, records: number, found: boolean) => void;

function toConnection(record: LabelRecord): Connection {
  const labels = readLabels(record);
  return {
    username: (labels.Username ?? "").toLowerCase(),
    name: labels.Name ?? "",
    url: labels.URL ?? "",
    followedAt: record.timestamp ?? 0
  };
}

async function readProfile(source: ExportSource): Promise<Profile> {
  const file = source.find("personal_information/personal_information.json");
  const payload = await source.readJson<{ profile_user?: MapRecord[] }>(file);
  const fields = payload?.profile_user?.[0] ? readMap(payload.profile_user[0]) : {};
  return {
    username: fields.Username ?? "",
    name: fields.Name ?? "",
    bio: fields.Bio ?? "",
    gender: fields.Gender ?? "",
    website: fields.Website ?? "",
    isPrivate: fields["Private Account"] === "True"
  };
}

async function readFollowers(source: ExportSource): Promise<Connection[]> {
  const rows: Connection[] = [];
  for (const file of source.findAll(/followers_\d+\.json$/)) {
    const payload = await source.readJson<MapRecord[]>(file);
    for (const record of payload ?? []) {
      for (const entry of record.string_list_data ?? []) {
        if (entry.value === undefined) continue;
        rows.push({
          username: entry.value.toLowerCase(),
          name: demojibake(record.title ?? ""),
          url: entry.href ?? "",
          followedAt: entry.timestamp ?? 0
        });
      }
    }
  }
  return rows;
}

async function readFollowing(source: ExportSource): Promise<Connection[]> {
  const file = source.find("followers_and_following/following.json");
  const payload = await source.readJson<{ relationships_following?: MapRecord[] }>(file);
  return (payload?.relationships_following ?? [])
    .map((record) => ({
      username: (record.title ?? "").toLowerCase(),
      name: "",
      url: record.string_list_data?.[0]?.href ?? "",
      followedAt: record.string_list_data?.[0]?.timestamp ?? 0
    }))
    .filter((row) => row.username.length > 0);
}

async function readContacts(source: ExportSource, track: Track): Promise<SyncedContact[]> {
  const file = source.find("contacts/synced_contacts.json");
  const payload = await source.readJson<{ contacts_contact_info?: MapRecord[] }>(file);
  const rows = (payload?.contacts_contact_info ?? []).map((record) => {
    const fields = readMap(record);
    const name = `${fields["First Name"] ?? ""} ${fields["Last Name"] ?? ""}`.trim();
    return { name, detail: fields["Contact Information"] ?? "" };
  });
  track("Contacts Meta holds", "synced_contacts.json", rows.length, file !== undefined);
  return rows;
}

async function readLikedPosts(source: ExportSource, track: Track): Promise<LikedPost[]> {
  const file = source.find("likes/liked_posts.json");
  const payload = await source.readJson<LabelRecord[]>(file);
  const rows = (payload ?? []).map((record) => {
    const labels = readLabels(record);
    const owner = readOwner(record);
    return {
      owner: owner?.username ?? "",
      ownerName: owner?.name ?? "",
      at: record.timestamp ?? 0,
      url: labels.URL ?? "",
      caption: labels.Caption ?? "",
      hashtags: readHashtags(record)
    };
  });
  track("Posts you liked", "liked_posts.json", rows.length, file !== undefined);
  return rows;
}

async function readLikedComments(source: ExportSource, track: Track): Promise<LikedComment[]> {
  const file = source.find("likes/liked_comments.json");
  const payload = await source.readJson<{ likes_comment_likes?: MapRecord[] }>(file);
  const rows = (payload?.likes_comment_likes ?? [])
    .map((record) => ({
      owner: (record.title ?? "").toLowerCase(),
      at: record.string_list_data?.[0]?.timestamp ?? 0,
      url: record.string_list_data?.[0]?.href ?? ""
    }))
    .filter((row) => row.owner.length > 0);
  track("Comments you liked", "liked_comments.json", rows.length, file !== undefined);
  return rows;
}

async function readStoryEvents(
  source: ExportSource,
  name: string,
  label: string,
  track: Track
): Promise<StoryEvent[]> {
  const file = source.find(`story_interactions/${name}.json`);
  const payload = await source.readJson<LabelRecord[]>(file);
  const rows = (payload ?? []).map((record) => {
    const labels = readLabels(record);
    const owner = readOwner(record);
    return {
      owner: owner?.username ?? "",
      ownerName: owner?.name ?? "",
      at: record.timestamp ?? 0,
      url: labels.URL ?? ""
    };
  });
  track(label, `${name}.json`, rows.length, file !== undefined);
  return rows;
}

const STORY_ANSWER_FILES = [
  ["quiz", "quizzes", "Question", "", "Quizzes you answered"],
  ["poll", "polls", "Question", "", "Polls you answered"],
  ["countdown", "countdowns", "Text", "", "Countdowns you followed"],
  ["question", "questions", "Question", "Answer", "Questions you answered"],
  ["reaction", "story_reaction_sticker_reactions", "", "Emoji", "Story stickers you tapped"]
] as const satisfies readonly (readonly [StoryAnswerKind, string, string, string, string])[];

async function readStoryAnswers(source: ExportSource, track: Track): Promise<StoryAnswer[]> {
  const rows: StoryAnswer[] = [];
  for (const [kind, name, promptKey, answerKey, label] of STORY_ANSWER_FILES) {
    const file = source.find(`story_interactions/${name}.json`);
    const payload = await source.readJson<LabelRecord[]>(file);
    const parsed = (payload ?? []).map((record) => {
      const labels = readLabels(record);
      const owner = readOwner(record);
      return {
        kind,
        owner: owner?.username ?? "",
        ownerName: owner?.name ?? "",
        prompt: promptKey.length > 0 ? (labels[promptKey] ?? "") : "",
        answer: answerKey.length > 0 ? (labels[answerKey] ?? "") : "",
        at: record.timestamp ?? 0,
        url: labels.URL ?? ""
      };
    });
    track(label, `${name}.json`, parsed.length, file !== undefined);
    rows.push(...parsed);
  }
  return rows.sort((left, right) => right.at - left.at);
}

async function readComments(source: ExportSource, track: Track): Promise<WrittenComment[]> {
  const rows: WrittenComment[] = [];
  const files = source.findAll(/comments\/post_comments_\d+\.json$/);
  for (const file of files) {
    const payload = await source.readJson<MapRecord[] | { comments_media_comments?: MapRecord[] }>(
      file
    );
    const records = Array.isArray(payload) ? payload : (payload?.comments_media_comments ?? []);
    for (const record of records) {
      const fields = readMap(record);
      rows.push({
        mediaOwner: (fields["Media Owner"] ?? "").toLowerCase(),
        body: fields.Comment ?? "",
        at: readMapTimestamp(record, "Time")
      });
    }
  }
  track("Comments you wrote", "post_comments_*.json", rows.length, files.length > 0);
  return rows;
}

async function readSaved(source: ExportSource, track: Track): Promise<SavedPost[]> {
  const file = source.find("saved/saved_posts.json");
  const payload = await source.readJson<LabelRecord[]>(file);
  const rows = (payload ?? []).map((record) => {
    const labels = readLabels(record);
    return {
      owner: readOwner(record)?.username ?? "",
      at: record.timestamp ?? 0,
      url: labels.URL ?? "",
      caption: labels.Caption ?? ""
    };
  });
  track("Saved posts", "saved_posts.json", rows.length, file !== undefined);
  return rows;
}

const SESSION_FILES = {
  login: ["login_activity", "account_history_login_history", "Logins Meta kept"],
  logout: ["logout_activity", "account_history_logout_history", "Logouts Meta kept"]
} as const;

async function readSessions(
  source: ExportSource,
  kind: "login" | "logout",
  track: Track
): Promise<SessionEvent[]> {
  const [name, key, label] = SESSION_FILES[kind];
  const file = source.find(`login_and_profile_creation/${name}.json`);
  const payload = await source.readJson<Record<string, MapRecord[]>>(file);
  const rows = (payload?.[key] ?? []).map((record) => {
    const fields = readMap(record);
    return {
      kind,
      ip: fields["IP Address"] ?? "",
      port: fields.Port ?? "",
      userAgent: fields["User Agent"] ?? "",
      language: fields["Language Code"] ?? "",
      app: "",
      deviceId: "",
      at: readMapTimestamp(record, "Time")
    };
  });
  track(label, `${name}.json`, rows.length, file !== undefined);
  return rows;
}

async function readProfileSessions(source: ExportSource, track: Track): Promise<SessionEvent[]> {
  const file = source.find("login_and_profile_creation/profile_activity.json");
  const payload = await source.readJson<LabelRecord[]>(file);
  const rows: SessionEvent[] = (payload ?? []).map((record) => {
    const labels = readLabels(record);
    return {
      kind: "profile",
      ip: labels["IP address"] ?? "",
      port: labels["Port number"] ?? "",
      userAgent: labels["User Agent"] ?? "",
      language: labels.Language ?? "",
      app: labels.App ?? "",
      deviceId: labels["Device ID"] ?? "",
      at: record.timestamp ?? 0
    };
  });
  track("Profile sessions", "profile_activity.json", rows.length, file !== undefined);
  return rows;
}

async function readAccountEvents(source: ExportSource, track: Track): Promise<AccountEvent[]> {
  const rows: AccountEvent[] = [];

  const passwordFile = source.find("login_and_profile_creation/password_change_activity.json");
  const passwords = await source.readJson<Record<string, MapRecord[]>>(passwordFile);
  for (const record of passwords?.account_history_password_change_history ?? []) {
    rows.push({
      kind: "password",
      detail: "You changed your password",
      at: readMapTimestamp(record, "Time")
    });
  }
  track(
    "Password changes",
    "password_change_activity.json",
    rows.length,
    passwordFile !== undefined
  );

  const privacyFile = source.find("login_and_profile_creation/profile_privacy_changes.json");
  const privacy = await source.readJson<Record<string, MapRecord[]>>(privacyFile);
  const privacyRows = privacy?.account_history_account_privacy_history ?? [];
  for (const record of privacyRows) {
    rows.push({
      kind: "privacy",
      detail: demojibake(record.title ?? ""),
      at: record.string_list_data?.[0]?.timestamp ?? 0
    });
  }
  track(
    "Privacy changes",
    "profile_privacy_changes.json",
    privacyRows.length,
    privacyFile !== undefined
  );

  const statusFile = source.find("login_and_profile_creation/profile_status_changes.json");
  const status = await source.readJson<Record<string, MapRecord[]>>(statusFile);
  const statusRows = status?.account_history_account_active_status_changes ?? [];
  for (const record of statusRows) {
    const fields = readMap(record);
    rows.push({
      kind: "status",
      detail: `You chose to ${fields["Activation Type"] ?? "change the account"}`,
      at: readMapTimestamp(record, "Time")
    });
  }
  track(
    "Account status changes",
    "profile_status_changes.json",
    statusRows.length,
    statusFile !== undefined
  );

  return rows.sort((left, right) => right.at - left.at);
}

async function readSignup(source: ExportSource, track: Track): Promise<SignupDetails> {
  const file = source.find("login_and_profile_creation/signup_details.json");
  const payload = await source.readJson<Record<string, MapRecord[]>>(file);
  const record = payload?.account_history_registration_info?.[0];
  const fields = record ? readMap(record) : {};
  track("Signup details", "signup_details.json", record ? 1 : 0, file !== undefined);
  return {
    username: fields.Username ?? "",
    ip: fields["IP Address"] ?? "",
    device: fields.Device ?? "",
    at: record ? readMapTimestamp(record, "Time") : 0
  };
}

async function readProfileChanges(source: ExportSource, track: Track): Promise<ProfileChange[]> {
  const file = source.find("personal_information/profile_changes.json");
  const payload = await source.readJson<{ profile_profile_change?: MapRecord[] }>(file);
  const rows = (payload?.profile_profile_change ?? []).map((record) => {
    const fields = readMap(record);
    return {
      field: fields.Changed ?? "",
      previous: fields["Previous Value"] ?? "",
      next: fields["New Value"] ?? "",
      at: readMapTimestamp(record, "Change Date")
    };
  });
  track("Profile changes", "profile_changes.json", rows.length, file !== undefined);
  return rows;
}

async function readStoredAbout(source: ExportSource, track: Track): Promise<StoredField[]> {
  const file = source.find("personal_information/personal_information.json");
  const payload = await source.readJson<{ profile_user?: MapRecord[] }>(file);
  const record = payload?.profile_user?.[0];
  const fields = record ? readMap(record) : {};
  const rows = Object.entries(fields)
    .map(([label, value]) => ({ label, value }))
    .filter((row) => row.value.length > 0);
  track("What Meta stores about you", "personal_information.json", rows.length, file !== undefined);
  return rows;
}

async function readAutofill(source: ExportSource, track: Track): Promise<StoredField[]> {
  const file = source.find("autofill_information/autofill_information.json");
  const payload = await source.readJson<LabelRecord[]>(file);
  const rows: StoredField[] = [];
  for (const record of payload ?? []) {
    for (const [label, value] of Object.entries(readLabels(record))) {
      if (value.length > 0) rows.push({ label, value });
    }
  }
  track("Autofill Meta saved", "autofill_information.json", rows.length, file !== undefined);
  return rows;
}

async function readSearches(source: ExportSource, track: Track): Promise<SearchRecord[]> {
  const rows: SearchRecord[] = [];

  const profileFile = source.find("recent_searches/profile_searches.json");
  const profiles = await source.readJson<{ searches_user?: MapRecord[] }>(profileFile);
  for (const record of profiles?.searches_user ?? []) {
    rows.push({
      kind: "profile",
      term: demojibake(record.title ?? ""),
      at: record.string_list_data?.[0]?.timestamp ?? 0
    });
  }

  const phraseFile = source.find("recent_searches/word_or_phrase_searches.json");
  const phrases = await source.readJson<{ searches_keyword?: MapRecord[] }>(phraseFile);
  for (const record of phrases?.searches_keyword ?? []) {
    const fields = readMap(record);
    rows.push({
      kind: "phrase",
      term: fields.Search ?? "",
      at: readMapTimestamp(record, "Time")
    });
  }

  track("Searches Meta kept", "recent_searches/*.json", rows.length, profileFile !== undefined);
  return rows.sort((left, right) => right.at - left.at);
}

async function readDownloadRequests(
  source: ExportSource,
  track: Track
): Promise<DownloadRequest[]> {
  const file = source.find("other_activity/your_information_download_requests.json");
  const payload = await source.readJson<LabelRecord[]>(file);
  const rows = (payload ?? []).map((record) => {
    const labels = readLabels(record);
    return {
      requestedAt: record.timestamp ?? 0,
      completedAt: Number(labels["Request completion time"] ?? 0),
      windowStart: Number(labels["Start date"] ?? 0),
      windowEnd: Number(labels["End date"] ?? 0),
      quality: labels["Media quality"] ?? ""
    };
  });
  track(
    "Exports you requested",
    "your_information_download_requests.json",
    rows.length,
    file !== undefined
  );
  return rows.sort((left, right) => right.requestedAt - left.requestedAt);
}

async function readNoteInteractions(
  source: ExportSource,
  track: Track
): Promise<NoteInteraction[]> {
  const file = source.find("personal_information/note_and_repost_interactions.json");
  const payload = await source.readJson<LabelRecord[]>(file);
  const rows: NoteInteraction[] = [];
  for (const record of payload ?? []) {
    for (const group of readNestedGroup(record, "Author")) {
      const username = (group.Username ?? "").toLowerCase();
      if (username.length > 0) rows.push({ username, name: group.Name ?? "" });
    }
  }
  track(
    "Notes and reposts you touched",
    "note_and_repost_interactions.json",
    rows.length,
    file !== undefined
  );
  return rows;
}

async function readAdvertisers(source: ExportSource, track: Track): Promise<Advertiser[]> {
  const file = source.find(
    "instagram_ads_and_businesses/advertisers_using_your_activity_or_information.json"
  );
  const payload = await source.readJson<{ label_values?: LabelRecord["label_values"] }>(file);
  const rows: Advertiser[] = [];
  for (const entry of payload?.label_values ?? []) {
    const bucket = demojibake(entry.label ?? "");
    for (const item of entry.vec ?? []) {
      if (item.value !== undefined) rows.push({ name: demojibake(item.value), bucket });
    }
  }
  track("Advertisers holding your data", "advertisers_*.json", rows.length, file !== undefined);
  return rows;
}

async function readAdCategories(source: ExportSource, track: Track): Promise<string[]> {
  const file = source.find("instagram_ads_and_businesses/other_categories_used_to_reach_you.json");
  const payload = await source.readJson<{ label_values?: LabelRecord["label_values"] }>(file);
  const rows = payload ? readVector(payload) : [];
  track("Categories Meta assigned you", "other_categories_*.json", rows.length, file !== undefined);
  return rows;
}

async function readLinkHistory(source: ExportSource, track: Track): Promise<LinkVisit[]> {
  const file = source.find("link_history/link_history.json");
  const payload = await source.readJson<LabelRecord[]>(file);
  const rows = (payload ?? []).map((record) => {
    const labels = readLabels(record);
    return {
      title: labels["Title of website page you visited"] ?? "",
      url: labels["Website link you visited"] ?? "",
      startedAt: labels["Website session start time"] ?? "",
      at: record.timestamp ?? 0
    };
  });
  track("In-app browser history", "link_history.json", rows.length, file !== undefined);
  return rows;
}

async function readSuggestedProfiles(
  source: ExportSource,
  track: Track
): Promise<SuggestedProfile[]> {
  const file = source.find("ads_and_topics/suggested_profiles_viewed.json");
  const payload = await source.readJson<LabelRecord[]>(file);
  const rows = (payload ?? [])
    .map((record) => ({
      username: (readLabels(record).Username ?? "").toLowerCase(),
      at: record.timestamp ?? 0
    }))
    .filter((row) => row.username.length > 0);
  track(
    "Profiles Meta suggested",
    "suggested_profiles_viewed.json",
    rows.length,
    file !== undefined
  );
  return rows;
}

async function readExpiredApps(source: ExportSource, track: Track): Promise<ExpiredApp[]> {
  const file = source.find("apps_and_websites/expired_apps.json");
  const payload = await source.readJson<LabelRecord[]>(file);
  const rows = (payload ?? []).map((record) => {
    const labels = readLabels(record);
    return {
      name: labels.Name ?? "",
      yourId: labels["Your ID in this app"] ?? "",
      addedAt: Number(labels["Added on"] ?? 0),
      lastActiveAt: Number(labels["Last active time"] ?? 0)
    };
  });
  track("Apps that held your data", "expired_apps.json", rows.length, file !== undefined);
  return rows;
}

type RawShare = {
  link?: string;
  share_text?: string;
  original_content_owner?: string;
  profile_share_username?: string;
};

type RawMessage = {
  sender_name?: string;
  timestamp_ms?: number;
  content?: string;
  share?: RawShare;
  photos?: unknown[];
  videos?: unknown[];
  audio_files?: unknown[];
  call_duration?: number;
  reactions?: { reaction?: string; actor?: string }[];
};

type RawThread = {
  participants?: { name?: string }[];
  messages?: RawMessage[];
  title?: string;
  thread_path?: string;
};

const THREAD_FOLDERS: readonly ThreadFolder[] = ["inbox", "message_requests", "broadcast"];

function messageKind(raw: RawMessage): MessageKind {
  if (raw.call_duration !== undefined) return "call";
  if ((raw.audio_files?.length ?? 0) > 0) return "audio";
  if ((raw.videos?.length ?? 0) > 0) return "video";
  if ((raw.photos?.length ?? 0) > 0) return "photo";
  if (raw.share !== undefined) return "share";
  return "text";
}

function toMessage(raw: RawMessage): ThreadMessage {
  const share = raw.share ?? {};
  return {
    sender: demojibake(raw.sender_name ?? ""),
    at: Math.round((raw.timestamp_ms ?? 0) / 1000),
    body: demojibake(raw.content ?? ""),
    kind: messageKind(raw),
    sharedFrom: (share.original_content_owner ?? "").toLowerCase(),
    sharedProfile: (share.profile_share_username ?? "").toLowerCase(),
    shareText: demojibake(share.share_text ?? ""),
    link: share.link ?? "",
    reactions: (raw.reactions ?? [])
      .filter((entry) => entry.reaction !== undefined)
      .map((entry) => ({
        actor: demojibake(entry.actor ?? ""),
        emoji: normalizeEmoji(decodeReaction(entry.reaction ?? ""))
      }))
  };
}

function folderOf(path: string): ThreadFolder {
  return THREAD_FOLDERS.find((folder) => path.includes(`messages/${folder}/`)) ?? "inbox";
}

async function readThreads(source: ExportSource, track: Track): Promise<Thread[]> {
  const files = source.findAll(
    /messages\/(inbox|message_requests|broadcast)\/[^/]+\/message_\d+\.json$/
  );
  const grouped = new Map<string, typeof files>();
  for (const file of files) {
    const id = file.path.replace(/\/message_\d+\.json$/, "");
    grouped.set(id, [...(grouped.get(id) ?? []), file]);
  }

  const threads: Thread[] = [];
  for (const [id, parts] of grouped) {
    const messages: ThreadMessage[] = [];
    let title = "";
    let participants: string[] = [];
    for (const file of parts) {
      const payload = await source.readJson<RawThread>(file);
      if (!payload) continue;
      if (title.length === 0) title = demojibake(payload.title ?? "");
      if (participants.length === 0) {
        participants = (payload.participants ?? []).map((entry) => demojibake(entry.name ?? ""));
      }
      for (const raw of payload.messages ?? []) messages.push(toMessage(raw));
    }
    messages.sort((left, right) => left.at - right.at);
    threads.push({ id, title, folder: folderOf(id), participants, messages });
  }

  const total = threads.reduce((sum, thread) => sum + thread.messages.length, 0);
  track("Conversations", "messages/**/message_*.json", threads.length, threads.length > 0);
  track("Messages", "messages/**/message_*.json", total, files.length > 0);
  return threads.sort((left, right) => right.messages.length - left.messages.length);
}

type RawMediaFile = {
  uri?: string;
  title?: string;
  creation_timestamp?: number;
  media_metadata?: Record<string, { exif_data?: Record<string, unknown>[] }>;
};

type RawMediaGroup = {
  media?: RawMediaFile[];
  title?: string;
  creation_timestamp?: number;
};

function exifOf(file: RawMediaFile | undefined): Record<string, unknown> {
  for (const group of Object.values(file?.media_metadata ?? {})) {
    const first = group.exif_data?.[0];
    if (first) return first;
  }
  return {};
}

function readText(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

function toOwnMedia(kind: OwnMediaKind, group: RawMediaGroup): OwnMedia {
  const files = group.media ?? [];
  const first = files[0];
  const exif = exifOf(first);
  return {
    kind,
    at: group.creation_timestamp ?? first?.creation_timestamp ?? 0,
    caption: demojibake(group.title ?? first?.title ?? ""),
    uri: first?.uri ?? "",
    device: readText(exif, "device_id"),
    lens: readText(exif, "lens_model"),
    latitude: readText(exif, "latitude"),
    longitude: readText(exif, "longitude"),
    files: Math.max(1, files.length)
  };
}

const MEDIA_FILES = [
  ["story", /media\/stories\.json$/, "ig_stories", "Your stories"],
  ["post", /media\/posts(_\d+)?\.json$/, "", "Your posts"],
  ["archived", /media\/archived_posts\.json$/, "ig_archived_post_media", "Archived posts"],
  ["other", /media\/other_content\.json$/, "", "Reels and drafts"],
  ["repost", /media\/reposts\.json$/, "", "Reposts"]
] as const satisfies readonly (readonly [OwnMediaKind, RegExp, string, string])[];

async function readOwnMedia(source: ExportSource, track: Track): Promise<OwnMedia[]> {
  const rows: OwnMedia[] = [];
  for (const [kind, pattern, key, label] of MEDIA_FILES) {
    const files = source.findAll(pattern);
    let found = 0;
    for (const file of files) {
      const payload = await source.readJson<RawMediaGroup[] | Record<string, RawMediaGroup[]>>(
        file
      );
      const groups = Array.isArray(payload)
        ? payload
        : key.length > 0
          ? (payload?.[key] ?? [])
          : [];
      for (const group of groups) {
        rows.push(toOwnMedia(kind, group));
        found += 1;
      }
    }
    track(label, pattern.source, found, files.length > 0);
  }
  return rows.sort((left, right) => right.at - left.at);
}

async function readSavedMusic(source: ExportSource, track: Track): Promise<SavedTrack[]> {
  const file = source.find("saved/saved_music.json");
  const payload = await source.readJson<LabelRecord[]>(file);
  const rows = (payload ?? []).map((record) => {
    const labels = readLabels(record);
    return {
      title: labels.Title ?? "",
      artist: labels.Artist ?? "",
      at: record.timestamp ?? 0
    };
  });
  track("Saved music", "saved_music.json", rows.length, file !== undefined);
  return rows;
}

async function readSavedCollections(source: ExportSource, track: Track): Promise<string[]> {
  const file = source.find("saved/saved_collections.json");
  const payload = await source.readJson<LabelRecord[]>(file);
  const rows = (payload ?? [])
    .map((record) => readLabels(record).Name ?? "")
    .filter((name) => name.length > 0);
  track("Saved collections", "saved_collections.json", rows.length, file !== undefined);
  return rows;
}

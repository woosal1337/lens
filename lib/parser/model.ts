export type DisplayMessage = { key: string; values?: string[] };

export type Profile = {
  username: string;
  name: string;
  bio: string;
  gender: string;
  website: string;
  isPrivate: boolean;
};

export type StoredField = { label: string; value: string };

export type SearchRecord = {
  kind: "profile" | "phrase";
  term: string;
  at: number;
};

export type DownloadRequest = {
  requestedAt: number;
  completedAt: number;
  windowStart: number;
  windowEnd: number;
  quality: string;
};

export type NoteInteraction = {
  username: string;
  name: string;
};

export type Connection = {
  username: string;
  name: string;
  url: string;
  followedAt: number;
};

export type LikedPost = {
  owner: string;
  ownerName: string;
  at: number;
  url: string;
  caption: string;
  hashtags: string[];
};

export type LikedComment = {
  owner: string;
  at: number;
  url: string;
};

export type StoryEvent = {
  owner: string;
  ownerName: string;
  at: number;
  url: string;
};

export type StoryAnswerKind = "quiz" | "poll" | "countdown" | "question" | "reaction";

export type StoryAnswer = {
  kind: StoryAnswerKind;
  owner: string;
  ownerName: string;
  prompt: string;
  answer: string;
  at: number;
  url: string;
};

export type WrittenComment = {
  mediaOwner: string;
  body: string;
  at: number;
};

export type SavedPost = {
  owner: string;
  at: number;
  url: string;
  caption: string;
};

export type SessionKind = "login" | "logout" | "profile";

export type SessionEvent = {
  kind: SessionKind;
  ip: string;
  port: string;
  userAgent: string;
  language: string;
  app: string;
  deviceId: string;
  at: number;
};

export type AccountEventKind = "password" | "privacy" | "status";

export type AccountEvent = {
  kind: AccountEventKind;
  detail: string;
  at: number;
};

export type SignupDetails = {
  username: string;
  ip: string;
  device: string;
  at: number;
};

export type ProfileChange = {
  field: string;
  previous: string;
  next: string;
  at: number;
};

export type Advertiser = {
  name: string;
  bucket: string;
};

export type SyncedContact = {
  name: string;
  detail: string;
};

export type LinkVisit = {
  title: string;
  url: string;
  startedAt: string;
  at: number;
};

export type SuggestedProfile = {
  username: string;
  at: number;
};

export type ExpiredApp = {
  name: string;
  yourId: string;
  addedAt: number;
  lastActiveAt: number;
};

export type OwnMediaKind = "story" | "post" | "archived" | "other" | "repost";

export type OwnMedia = {
  kind: OwnMediaKind;
  at: number;
  caption: string;
  uri: string;
  device: string;
  lens: string;
  latitude: string;
  longitude: string;
  files: number;
};

export type SavedTrack = {
  title: string;
  artist: string;
  at: number;
};

export type ThreadFolder = "inbox" | "message_requests" | "broadcast";

export type MessageKind = "text" | "share" | "photo" | "video" | "audio" | "call";

export type MessageReaction = { actor: string; emoji: string };

export type ThreadMessage = {
  sender: string;
  at: number;
  body: string;
  kind: MessageKind;
  sharedFrom: string;
  sharedProfile: string;
  shareText: string;
  link: string;
  reactions: MessageReaction[];
};

export type Thread = {
  id: string;
  title: string;
  folder: ThreadFolder;
  participants: string[];
  messages: ThreadMessage[];
};

export type ThreadSummary = {
  id: string;
  title: string;
  folder: ThreadFolder;
  participants: string[];
  messages: number;
};

export type CoverageEntry = {
  label: string;
  file: string;
  records: number;
  found: boolean;
};

export type ExportModel = {
  profile: Profile;
  followers: Connection[];
  following: Connection[];
  pendingOut: Connection[];
  pendingIn: Connection[];
  recentRequests: Connection[];
  unfollowed: Connection[];
  blocked: Connection[];
  closeFriends: Connection[];
  restricted: Connection[];
  likedPosts: LikedPost[];
  likedComments: LikedComment[];
  storyViews: StoryEvent[];
  storyLikes: StoryEvent[];
  storyAnswers: StoryAnswer[];
  comments: WrittenComment[];
  saved: SavedPost[];
  logins: SessionEvent[];
  logouts: SessionEvent[];
  profileSessions: SessionEvent[];
  accountEvents: AccountEvent[];
  signup: SignupDetails;
  profileChanges: ProfileChange[];
  storedAbout: StoredField[];
  autofill: StoredField[];
  searches: SearchRecord[];
  downloadRequests: DownloadRequest[];
  noteInteractions: NoteInteraction[];
  advertisers: Advertiser[];
  adCategories: string[];
  contacts: SyncedContact[];
  linkHistory: LinkVisit[];
  suggestedProfiles: SuggestedProfile[];
  expiredApps: ExpiredApp[];
  ownMedia: OwnMedia[];
  savedMusic: SavedTrack[];
  savedCollections: string[];
  threads: ThreadSummary[];
  coverage: CoverageEntry[];
};

export type FullExport = {
  model: ExportModel;
  threads: Thread[];
};

export type ParseProgress = {
  percent: number;
  message: string;
  files: number;
  records: number;
};

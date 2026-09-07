import type {
  Connection,
  ExportModel,
  FullExport,
  Thread,
  OwnMedia,
  OwnMediaKind,
  SessionEvent,
  SessionKind
} from "@/lib/parser/model";

const HANDLES = [
  "aylin.demir",
  "burak_ozturk",
  "cemre.k",
  "deniz.aydin",
  "ekin_yilmaz",
  "furkan.ates",
  "gizem.sari",
  "hakan_dogan",
  "irem.kaplan",
  "jale.ozkan",
  "kerem.tas",
  "lale_aksoy",
  "murat.eren",
  "nazli.gunes",
  "onur_kaya",
  "pelin.arslan",
  "rana_celik",
  "serkan.bulut",
  "tuana.koc",
  "umut_polat",
  "veli.sahin",
  "yasemin.ak",
  "zeynep_ari",
  "alper.duman",
  "berk_ozer"
];

const NAMES = [
  "Aylin Demir",
  "Burak Öztürk",
  "Cemre K.",
  "Deniz Aydın",
  "Ekin Yılmaz",
  "Furkan Ateş",
  "Gizem Sarı",
  "",
  "İrem Kaplan",
  "Jale Özkan",
  "Kerem Taş",
  "",
  "Murat Eren",
  "Nazlı Güneş",
  "Onur Kaya",
  "Pelin Arslan",
  "Rana Çelik",
  "",
  "Tuana Koç",
  "Umut Polat",
  "Veli Şahin",
  "Yasemin Ak",
  "Zeynep Arı",
  "",
  "Berk Özer"
];

const TAGS = [
  "istanbul",
  "coding",
  "film",
  "kahve",
  "design",
  "reels",
  "keşfet",
  "typography",
  "analog",
  "berlin"
];

const CAPTIONS = [
  "Bir sabah, bir kahve",
  "Shot on film, printed at home",
  "Six years of the same walk",
  "Notes from the studio",
  "",
  "Kayıt: gece 03.00"
];

const AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
  "Instagram 443.0.0.33.78 (iPhone18,2; iOS 26_6; en_US; en; scale=3.00; 1320x2868; 1043399932) AppleWebKit/420+",
  "Instagram 136.0.0.34.124 Android (29/10; 408dpi; 1080x2259; Google; Pixel 4a; sunfish; sm7150; en_US; 208061732)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0",
  "C++/THttpClient"
];

const ADVERTISER_BUCKETS = [
  "Advertisers that have uploaded an audience list containing entries that were matched to your Instagram profile",
  "Advertisers who have uploaded an audience list that was matched to your profile based on interactions you may have had with the advertiser's website, app or store",
  "Advertisers whose store you visited"
];

const MESSAGE_BODIES = [
  "Bunu gördün mü",
  "Yarın görüşürüz",
  "Sent an attachment",
  "Okay",
  "Bir dakika",
  "Look at this one"
];

const MESSAGE_KINDS = ["text", "share", "text", "photo", "text", "audio"] as const;

const PROFILE_FIELDS = [
  "Profile Bio Text",
  "Profile Name",
  "Username",
  "Profile Bio Link",
  "Email"
];

const ACCOUNT_DETAILS = [
  "You changed your password",
  "Switched to Private",
  "You chose to reactivate",
  "Switched to Public"
];

const DAY = 86400;
const NOW = 1787860000;

function connection(index: number, ageDays: number): Connection {
  return {
    username: HANDLES[index % HANDLES.length] ?? `account_${index}`,
    name: NAMES[index % NAMES.length] ?? "",
    url: "",
    followedAt: NOW - ageDays * DAY
  };
}

function session(kind: SessionKind, index: number, ageDays: number): SessionEvent {
  return {
    kind,
    ip: `10.0.${index % 5}.${index % 250}`,
    port: String(30000 + index * 7),
    userAgent: AGENTS[index % AGENTS.length] ?? "",
    language: "en",
    app: index % 2 === 0 ? "iOS" : "",
    deviceId: `DEVICE-${index % 6}`,
    at: NOW - ageDays * DAY
  };
}

const DEVICES = ["iPhone 15 Pro", "Pixel 4a", "iPhone 12", ""];

function ownMedia(kind: OwnMediaKind, index: number, ageDays: number): OwnMedia {
  const located = index % 4 === 0;
  return {
    kind,
    at: NOW - ageDays * DAY,
    caption: CAPTIONS[index % CAPTIONS.length] ?? "",
    uri: `media/${kind}/${index}.jpg`,
    device: DEVICES[index % DEVICES.length] ?? "",
    lens: index % 3 === 0 ? "Wide camera" : "",
    latitude: located ? String(41 - index * 0.01) : "",
    longitude: located ? String(29 + index * 0.02) : "",
    files: (index % 3) + 1
  };
}

function threadName(index: number): string {
  const name = NAMES[(index * 2) % NAMES.length] ?? "";
  return name.length > 0 ? name : `Group ${index}`;
}

function series<T>(size: number, make: (index: number) => T): T[] {
  return Array.from({ length: size }, (_, index) => make(index));
}

export function syntheticExport(): FullExport {
  const followers = series(18, (index) => connection(index, index * 37 + 40));
  const following = series(25, (index) => connection(index, index * 29 + 12));

  const threads: Thread[] = series(12, (index) => ({
    id: `inbox/thread-${index}`,
    title: threadName(index),
    folder: index % 7 === 0 ? "message_requests" : "inbox",
    participants: [
      "Preview Account",
      threadName(index),
      ...(index % 5 === 0 ? [NAMES[(index * 3) % NAMES.length] ?? ""] : [])
    ],
    messages: series(40 + index * 11, (step) => ({
      sender: step % 3 === 0 ? "Preview Account" : threadName(index),
      at: NOW - (600 - step) * 3600 - index * 40 * DAY,
      body: step % 4 === 0 ? "" : (MESSAGE_BODIES[step % MESSAGE_BODIES.length] ?? ""),
      kind: MESSAGE_KINDS[step % MESSAGE_KINDS.length] ?? "text",
      sharedFrom: step % 4 === 0 ? (HANDLES[(step * 3) % HANDLES.length] ?? "") : "",
      sharedProfile: step % 37 === 0 ? (HANDLES[step % HANDLES.length] ?? "") : "",
      shareText: step % 4 === 0 ? "Bunu gördün mü" : "",
      link: step % 4 === 0 ? `instagram.com/reel/preview${step}` : "",
      reactions: step % 9 === 0 ? [{ actor: threadName(index), emoji: "❤" }] : []
    }))
  }));

  const model: ExportModel = {
    profile: {
      username: "preview_account",
      name: "Preview Account",
      bio: "Synthetic data for design work",
      gender: "",
      website: "",
      isPrivate: true
    },
    followers,
    following,
    pendingOut: series(9, (index) => connection(index + 4, 300 + index * 210)),
    pendingIn: series(3, (index) => connection(index + 11, 60 + index * 20)),
    recentRequests: series(6, (index) => connection(index + 2, 20 + index * 9)),
    unfollowed: series(4, (index) => connection(index + 7, 12 + index * 6)),
    blocked: series(2, (index) => connection(index + 15, 400 + index * 90)),
    closeFriends: series(7, (index) => connection(index, 200 + index * 33)),
    restricted: series(1, (index) => connection(index + 20, 500)),
    likedPosts: series(240, (index) => ({
      owner: HANDLES[index % HANDLES.length] ?? "",
      ownerName: NAMES[index % NAMES.length] ?? "",
      at: NOW - (index % 900) * DAY,
      url: "",
      caption: CAPTIONS[index % CAPTIONS.length] ?? "",
      hashtags: [TAGS[index % TAGS.length] ?? "", TAGS[(index + 3) % TAGS.length] ?? ""]
    })),
    likedComments: series(34, (index) => ({
      owner: HANDLES[(index * 7) % HANDLES.length] ?? "",
      at: NOW - index * 17 * DAY,
      url: ""
    })),
    storyViews: series(120, (index) => ({
      owner: HANDLES[(index * 3) % HANDLES.length] ?? "",
      ownerName: "",
      at: NOW - (index % 28) * DAY,
      url: ""
    })),
    storyLikes: series(60, (index) => ({
      owner: HANDLES[(index * 5) % HANDLES.length] ?? "",
      ownerName: "",
      at: NOW - (index % 700) * DAY,
      url: ""
    })),
    storyAnswers: series(19, (index) => ({
      kind: (["quiz", "poll", "countdown", "question", "reaction"] as const)[index % 5] ?? "quiz",
      owner: HANDLES[(index * 4) % HANDLES.length] ?? "",
      ownerName: NAMES[(index * 4) % NAMES.length] ?? "",
      prompt: index % 2 === 0 ? "Hangi filmi izlemeliyim" : "Pick one",
      answer: index % 3 === 0 ? "Berserk" : "",
      at: NOW - index * 23 * DAY,
      url: ""
    })),
    comments: series(22, (index) => ({
      mediaOwner: HANDLES[index % HANDLES.length] ?? "",
      body: "",
      at: NOW - index * 21 * DAY
    })),
    saved: series(48, (index) => ({
      owner: HANDLES[(index * 2) % HANDLES.length] ?? "",
      at: NOW - index * 13 * DAY,
      url: "",
      caption: ""
    })),
    logins: series(31, (index) => session("login", index, index * 24)),
    logouts: series(8, (index) => session("logout", index, index * 61)),
    profileSessions: series(44, (index) => session("profile", index, index * 17)),
    accountEvents: series(12, (index) => ({
      kind: (["password", "privacy", "status"] as const)[index % 3] ?? "password",
      detail: ACCOUNT_DETAILS[index % ACCOUNT_DETAILS.length] ?? "",
      at: NOW - index * 71 * DAY
    })),
    signup: {
      username: "preview_account",
      ip: "10.0.0.1",
      device: "Pixel 4a",
      at: NOW - 2200 * DAY
    },
    profileChanges: series(14, (index) => ({
      field: PROFILE_FIELDS[index % PROFILE_FIELDS.length] ?? "Profile Bio Text",
      previous: index % 3 === 0 ? "" : `Old value ${index}`,
      next: `New value ${index}`,
      at: NOW - index * 60 * DAY
    })),
    storedAbout: [
      { label: "Username", value: "preview_account" },
      { label: "Name", value: "Preview Account" },
      { label: "Gender", value: "male" },
      { label: "Private Account", value: "True" }
    ],
    autofill: [
      { label: "First/given name", value: "Preview" },
      { label: "City", value: "Istanbul" },
      { label: "Country", value: "Turkey" }
    ],
    searches: series(11, (index) => ({
      kind: index % 3 === 0 ? ("phrase" as const) : ("profile" as const),
      term: index % 3 === 0 ? "fenerbahce" : (HANDLES[index % HANDLES.length] ?? ""),
      at: NOW - index * 4 * DAY
    })),
    downloadRequests: series(5, (index) => ({
      requestedAt: NOW - index * 120 * DAY,
      completedAt: NOW - index * 120 * DAY + 900,
      windowStart: NOW - (index + 1) * 240 * DAY,
      windowEnd: NOW - index * 120 * DAY,
      quality: index % 2 === 0 ? "Medium" : "High"
    })),
    noteInteractions: series(23, (index) => ({
      username: HANDLES[(index * 5) % HANDLES.length] ?? "",
      name: NAMES[(index * 5) % NAMES.length] ?? ""
    })),
    advertisers: series(340, (index) => ({
      name: `Advertiser ${index}`,
      bucket: ADVERTISER_BUCKETS[index % ADVERTISER_BUCKETS.length] ?? ""
    })),
    adCategories: series(9, (index) => `Category ${index}`),
    contacts: series(52, (index) => ({ name: `Contact ${index}`, detail: "" })),
    linkHistory: series(17, (index) => ({
      title: `Page ${index}`,
      url: `news-${index % 5}.example/page-${index}`,
      startedAt: "",
      at: NOW - index * 2 * DAY
    })),
    suggestedProfiles: series(63, (index) => ({
      username: HANDLES[(index * 6) % HANDLES.length] ?? "",
      at: NOW - (900 + index * 5) * DAY
    })),
    expiredApps: series(4, (index) => ({
      name: `Partner app ${index}`,
      yourId: `${1000 + index}`,
      addedAt: NOW - (600 + index * 90) * DAY,
      lastActiveAt: NOW - (400 + index * 40) * DAY
    })),
    ownMedia: [
      ...series(96, (index) => ownMedia("story", index, index * 9)),
      ...series(11, (index) => ownMedia("post", index, index * 70)),
      ...series(6, (index) => ownMedia("archived", index, 200 + index * 40)),
      ...series(4, (index) => ownMedia("repost", index, 40 + index * 25))
    ],
    savedMusic: series(19, (index) => ({
      title: `Track ${index}`,
      artist: NAMES[index % NAMES.length] ?? "Unknown",
      at: NOW - index * 18 * DAY
    })),
    savedCollections: ["Design", "Travel", "Food"],
    threads: threads.map((thread) => ({
      id: thread.id,
      title: thread.title,
      folder: thread.folder,
      participants: thread.participants,
      messages: thread.messages.length
    })),
    coverage: [
      { label: "Followers", file: "followers_1.json", records: followers.length, found: true },
      { label: "Following", file: "following.json", records: following.length, found: true },
      { label: "Messages", file: "messages/**", records: 0, found: false }
    ]
  };

  return { model, threads };
}

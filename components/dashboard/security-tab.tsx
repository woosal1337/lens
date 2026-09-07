"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { type Translator } from "@/lib/i18n/translate";

import { useMemo, useState } from "react";
import { ChartFrame } from "@/components/chart/chart-frame";
import { MonthlyBars, toMonthly } from "@/components/chart/monthly-bars";
import { RankBars, toRanked } from "@/components/chart/rank-bars";
import {
  AbsentNotice,
  Chip,
  csvColumns,
  DataPanel,
  ExportButton,
  FilterTabs,
  PageHead,
  SearchField,
  SectionLayout,
  Stat,
  Text,
  Toolbar,
  type Column,
  type FilterTab
} from "@/components/ui";
import { agentLabel, describeAgent } from "@/lib/analysis/agent";
import type { AccountEvent, ExportModel, SessionEvent, SessionKind } from "@/lib/parser/model";

import { foldForSearch } from "@/lib/parser/text";

function createViews(t: Translator) {
  const VIEWS = [
    { id: "timeline", label: t("Every session") },
    { id: "addresses", label: t("By address") },
    { id: "devices", label: t("Devices") },
    { id: "changes", label: t("Account changes") }
  ] as const;
  return VIEWS;
}

type ViewId = ReturnType<typeof createViews>[number]["id"];

function createLede(t: Translator) {
  const LEDE: Record<ViewId, string> = {
    timeline: t(
      "Every login, logout and profile session Meta kept, newest first. Each row holds the address, the port and the client that made it."
    ),
    addresses: t(
      "The same sessions, grouped by address. One address you do not know is the reason this tab exists."
    ),
    devices: t(
      "Every client that reached your account, with the first and the last time it appears."
    ),
    changes: t(
      "Your password changes, your public and private flips, and every time you switched the account off and on."
    )
  };
  return LEDE;
}

function createKindLabel(t: Translator) {
  const KIND_LABEL: Record<SessionKind, string> = {
    login: t("Login"),
    logout: t("Logout"),
    profile: t("Profile")
  };
  return KIND_LABEL;
}

function createEventLabel(t: Translator) {
  const EVENT_LABEL: Record<AccountEvent["kind"], string> = {
    password: t("Password"),
    privacy: t("Privacy"),
    status: t("Status")
  };
  return EVENT_LABEL;
}

type AddressRow = {
  address: string;
  sessions: number;
  clients: number;
  first: number;
  last: number;
};
type DeviceRow = {
  key: string;
  client: string;
  platform: string;
  device: string;
  sessions: number;
  first: number;
  last: number;
};

function allSessions(model: ExportModel): SessionEvent[] {
  return [...model.logins, ...model.logouts, ...model.profileSessions].sort(
    (left, right) => right.at - left.at
  );
}

function addressRows(t: Translator, sessions: readonly SessionEvent[]): AddressRow[] {
  const groups = new Map<
    string,
    { clients: Set<string>; count: number; first: number; last: number }
  >();
  for (const row of sessions) {
    const key = row.ip.length > 0 ? row.ip : t("not recorded");
    const found = groups.get(key) ?? {
      clients: new Set<string>(),
      count: 0,
      first: row.at,
      last: row.at
    };
    found.count += 1;
    found.clients.add(agentLabel(row.userAgent));
    if (row.at > 0) {
      found.first = found.first === 0 ? row.at : Math.min(found.first, row.at);
      found.last = Math.max(found.last, row.at);
    }
    groups.set(key, found);
  }
  return [...groups.entries()]
    .map(([address, value]) => ({
      address,
      sessions: value.count,
      clients: value.clients.size,
      first: value.first,
      last: value.last
    }))
    .sort((left, right) => right.sessions - left.sessions);
}

function displayAgent(t: Translator, userAgent: string) {
  const agent = describeAgent(userAgent);
  return {
    ...agent,
    client: t.known(agent.client),
    platform: agent.platform === "server" ? t("Server") : agent.platform
  };
}

function displayAgentLabel(t: Translator, userAgent: string) {
  const { client, platform, device } = displayAgent(t, userAgent);
  const tail = device.length > 0 ? device : platform;
  return tail.length > 0 ? `${client} · ${tail}` : client;
}

function deviceRows(t: Translator, sessions: readonly SessionEvent[]): DeviceRow[] {
  const groups = new Map<string, Omit<DeviceRow, "key">>();
  for (const row of sessions) {
    const agent = displayAgent(t, row.userAgent);
    const key = agentLabel(row.userAgent);
    const found: Omit<DeviceRow, "key"> = groups.get(key) ?? {
      ...agent,
      sessions: 0,
      first: row.at,
      last: row.at
    };
    found.sessions += 1;
    if (row.at > 0) {
      found.first = found.first === 0 ? row.at : Math.min(found.first, row.at);
      found.last = Math.max(found.last, row.at);
    }
    groups.set(key, found);
  }
  return [...groups.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((left, right) => right.sessions - left.sessions);
}

function search<Row>(
  rows: readonly Row[],
  needle: string,
  haystack: (row: Row) => string
): readonly Row[] {
  if (needle.length === 0) return rows;
  return rows.filter((row) => foldForSearch(haystack(row)).includes(needle));
}

function createSessionColumns(t: Translator) {
  const SESSION_COLUMNS: Column<SessionEvent>[] = [
    {
      id: "kind",
      header: t("Kind"),
      hint: t("what Meta logged"),
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.kind,
      render: (row) => (
        <Chip tone={row.kind === "login" ? "signal" : "neutral"}>
          {createKindLabel(t)[row.kind]}
        </Chip>
      )
    },
    {
      id: "at",
      header: t("When"),
      hint: t("the date Meta stamped"),
      width: "minmax(120px, 0.6fr)",
      sortValue: (row) => row.at,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {t.isoDate(row.at)}
        </Text>
      )
    },
    {
      id: "ip",
      header: t("Address"),
      hint: t("look it up yourself"),
      width: "minmax(150px, 0.9fr)",
      sortValue: (row) => row.ip,
      render: (row) => (
        <Text size="label" tone={row.ip.length === 0 ? "subtle" : "muted"} as="span">
          {row.ip.length === 0 ? t("not recorded") : row.ip}
        </Text>
      )
    },
    {
      id: "client",
      header: t("Client"),
      hint: t("read from the user agent"),
      width: "minmax(240px, 1.6fr)",
      text: (row) => displayAgentLabel(t, row.userAgent),
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {displayAgentLabel(t, row.userAgent)}
        </Text>
      )
    },
    {
      id: "port",
      header: t("Port"),
      hint: t("Meta kept this too"),
      align: "end",
      width: "minmax(100px, 0.4fr)",
      sortValue: (row) => row.port,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {row.port.length === 0 ? "—" : row.port}
        </Text>
      )
    }
  ];
  return SESSION_COLUMNS;
}

function createAddressColumns(t: Translator) {
  const ADDRESS_COLUMNS: Column<AddressRow>[] = [
    {
      id: "address",
      header: t("Address"),
      hint: t("look it up yourself"),
      width: "minmax(180px, 1.2fr)",
      sortValue: (row) => row.address,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.address}
        </Text>
      )
    },
    {
      id: "sessions",
      header: t("Sessions"),
      hint: t("login, logout, profile"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.sessions,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {t.count(row.sessions)}
        </Text>
      )
    },
    {
      id: "clients",
      header: t("Clients"),
      hint: t("distinct user agents"),
      align: "end",
      width: "minmax(110px, 0.5fr)",
      sortValue: (row) => row.clients,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {t.count(row.clients)}
        </Text>
      )
    },
    {
      id: "first",
      header: t("First seen"),
      hint: t("the oldest session"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.first,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.first)}
        </Text>
      )
    },
    {
      id: "last",
      header: t("Last seen"),
      hint: t("the newest session"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.last,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.last)}
        </Text>
      )
    }
  ];
  return ADDRESS_COLUMNS;
}

function createDeviceColumns(t: Translator) {
  const DEVICE_COLUMNS: Column<DeviceRow>[] = [
    {
      id: "client",
      header: t("Client"),
      hint: t("the app or the browser"),
      width: "minmax(200px, 1.2fr)",
      sortValue: (row) => row.client,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {row.client}
        </Text>
      )
    },
    {
      id: "platform",
      header: t("Platform"),
      hint: t("the operating system"),
      width: "minmax(140px, 0.8fr)",
      sortValue: (row) => row.platform,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {row.platform.length === 0 ? "—" : row.platform}
        </Text>
      )
    },
    {
      id: "device",
      header: t("Device"),
      hint: t("when Meta named it"),
      width: "minmax(170px, 1fr)",
      sortValue: (row) => row.device,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {row.device.length === 0 ? "—" : row.device}
        </Text>
      )
    },
    {
      id: "sessions",
      header: t("Sessions"),
      hint: t("every kind counted"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.sessions,
      render: (row) => (
        <Text size="label" tone="primary" as="span">
          {t.count(row.sessions)}
        </Text>
      )
    },
    {
      id: "first",
      header: t("First seen"),
      hint: t("the oldest session"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.first,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.first)}
        </Text>
      )
    },
    {
      id: "last",
      header: t("Last seen"),
      hint: t("the newest session"),
      align: "end",
      width: "minmax(120px, 0.5fr)",
      sortValue: (row) => row.last,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.last)}
        </Text>
      )
    }
  ];
  return DEVICE_COLUMNS;
}

function createEventColumns(t: Translator) {
  const EVENT_COLUMNS: Column<AccountEvent>[] = [
    {
      id: "kind",
      header: t("Kind"),
      hint: t("what changed"),
      width: "minmax(130px, 0.5fr)",
      sortValue: (row) => row.kind,
      render: (row) => (
        <Chip tone={row.kind === "password" ? "signal" : "neutral"}>
          {createEventLabel(t)[row.kind]}
        </Chip>
      )
    },
    {
      id: "detail",
      header: t("What happened"),
      hint: t("as Meta recorded it"),
      width: "minmax(320px, 2.4fr)",
      text: (row) => row.detail,
      render: (row) => (
        <Text size="label" tone="muted" as="span">
          {row.detail}
        </Text>
      )
    },
    {
      id: "at",
      header: t("When"),
      hint: t("the date Meta stamped"),
      align: "end",
      width: "minmax(130px, 0.6fr)",
      sortValue: (row) => row.at,
      render: (row) => (
        <Text size="label" tone="subtle" as="span">
          {t.isoDate(row.at)}
        </Text>
      )
    }
  ];
  return EVENT_COLUMNS;
}

export function SecurityTab({ model }: { model: ExportModel }) {
  const t = useTranslation();

  const [view, setView] = useState<ViewId>("timeline");
  const [query, setQuery] = useState("");

  const sessions = useMemo(() => allSessions(model), [model]);
  const addresses = useMemo(() => addressRows(t, sessions), [sessions, t]);
  const devices = useMemo(() => deviceRows(t, sessions), [sessions, t]);

  const needle = foldForSearch(query.trim());
  const sessionRows = useMemo(
    () => search(sessions, needle, (row) => `${row.ip} ${row.userAgent} ${row.port} ${row.kind}`),
    [sessions, needle]
  );
  const addressMatches = useMemo(
    () => search(addresses, needle, (row) => row.address),
    [addresses, needle]
  );
  const deviceMatches = useMemo(
    () => search(devices, needle, (row) => `${row.client} ${row.platform} ${row.device}`),
    [devices, needle]
  );
  const eventMatches = useMemo(
    () => search(model.accountEvents, needle, (row) => `${row.kind} ${row.detail}`),
    [model, needle]
  );

  const shown = {
    timeline: sessionRows.length,
    addresses: addressMatches.length,
    devices: deviceMatches.length,
    changes: eventMatches.length
  };
  const units: Record<ViewId, string> = {
    timeline: "sessions",
    addresses: "addresses",
    devices: "clients",
    changes: "changes"
  };

  const tabs: FilterTab[] = createViews(t).map((item) => ({
    id: item.id,
    label: item.label,
    count: {
      timeline: sessions.length,
      addresses: addresses.length,
      devices: devices.length,
      changes: model.accountEvents.length
    }[item.id]
  }));

  const passwordChanges = model.accountEvents.filter((row) => row.kind === "password").length;
  const loginMonths = toMonthly(model.logins.map((row) => row.at));
  const changeMonths = toMonthly(model.accountEvents.map((row) => row.at));
  const addressTally = new Map(addresses.slice(0, 60).map((row) => [row.address, row.sessions]));

  const exportAction =
    view === "addresses" ? (
      <ExportButton
        name="lens-addresses"
        columns={csvColumns(createAddressColumns(t))}
        rows={addressMatches}
      />
    ) : view === "devices" ? (
      <ExportButton
        name="lens-clients"
        columns={csvColumns(createDeviceColumns(t))}
        rows={deviceMatches}
      />
    ) : view === "changes" ? (
      <ExportButton
        name="lens-account-changes"
        columns={csvColumns(createEventColumns(t))}
        rows={eventMatches}
      />
    ) : (
      <ExportButton
        name="lens-sessions"
        columns={csvColumns(createSessionColumns(t))}
        rows={sessionRows}
      />
    );

  return (
    <SectionLayout
      head={<PageHead title={t("Security")} lede={createLede(t)[view]} />}
      stats={
        <>
          <Stat
            label={t("Logins Meta kept")}
            icon="security"
            value={model.logins.length}
            hint={t("and {0} logouts", [t.count(model.logouts.length)])}
          />
          <Stat
            label={t("Addresses seen")}
            icon="address"
            value={addresses.length}
            hint={t("across every session")}
            tone="signal"
          />
          <Stat
            label={t("Clients seen")}
            icon="device"
            value={devices.length}
            hint={t("apps and browsers")}
          />
          <Stat
            label={t("Password changes")}
            icon="waiting"
            value={passwordChanges}
            hint={
              model.signup.at > 0
                ? t("since you joined on {0}", [t.isoDate(model.signup.at)])
                : t("in your whole history")
            }
          />
        </>
      }
      charts={
        <>
          <ChartFrame
            title={t("Logins, per month")}
            caption={t("{0} logins across {1} months", [
              t.count(model.logins.length),
              t.count(loginMonths.length)
            ])}
          >
            <MonthlyBars unit={t("Logins")} data={loginMonths} />
          </ChartFrame>
          <ChartFrame
            title={t("Busiest addresses")}
            caption={t("The top 6 of {0} addresses Meta recorded.", [t.count(addresses.length)])}
          >
            <RankBars data={toRanked(addressTally, 6)} />
          </ChartFrame>
          <ChartFrame
            title={t("Account changes, per month")}
            caption={t("{0} password, privacy and status changes", [
              t.count(model.accountEvents.length)
            ])}
          >
            <MonthlyBars unit={t("Changes")} data={changeMonths} tone="brand" />
          </ChartFrame>
        </>
      }
      toolbar={
        <Toolbar rows={shown[view]} unit={units[view]} action={exportAction}>
          <FilterTabs
            tabs={tabs}
            active={view}
            onSelect={(id) => {
              setView(id as ViewId);
            }}
            label={t("Security views")}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t("Search an address or a client")}
            label={t("Search security rows")}
          />
        </Toolbar>
      }
      panel={
        view === "addresses" ? (
          <DataPanel
            columns={createAddressColumns(t)}
            rows={addressMatches}
            rowKey={(row) => row.address}
            emptyTitle={t("No address matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "sessions", direction: "desc" }}
          />
        ) : view === "devices" ? (
          <DataPanel
            columns={createDeviceColumns(t)}
            rows={deviceMatches}
            rowKey={(row) => row.key}
            emptyTitle={t("No client matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "sessions", direction: "desc" }}
          />
        ) : view === "changes" ? (
          <DataPanel
            columns={createEventColumns(t)}
            rows={eventMatches}
            rowKey={(row) => `${row.kind}-${row.at}-${row.detail}`}
            emptyTitle={t("No change matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "at", direction: "desc" }}
          />
        ) : (
          <DataPanel
            columns={createSessionColumns(t)}
            rows={sessionRows}
            rowKey={(row) => `${row.kind}-${row.at}-${row.ip}-${row.port}`}
            emptyTitle={t("No session matches")}
            emptyDetail={t("Clear the search, or pick another view above.")}
            initialSort={{ id: "at", direction: "desc" }}
            isFlagged={(row) => row.kind === "login"}
          />
        )
      }
      notice={
        <AbsentNotice title={t("The most sensitive rows in your export")}>
          {t(
            "Meta keeps the address, the port, the language and the full client string for every session. Lens reads them here and sends them nowhere. It never looks an address up, because that needs a network call."
          )}
        </AbsentNotice>
      }
    />
  );
}

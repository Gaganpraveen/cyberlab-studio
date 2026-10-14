import { Flag, Play, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import {
  type ArpState,
  type DnsState,
  DEVICES,
  DNS_POISON_FLAG,
  GATEWAY_IP,
  HONEST_IP,
  ONPATH_FLAG,
  PROTECTED_HOST,
  deviceByRole,
  duplicateMacs,
  enableDai,
  enableDnssec,
  initialArp,
  initialDns,
  isOnPath,
  poisonDns,
  resolve,
  spoofArp,
} from './engine';
import { spoofingMitmLab } from './index';

const ATTACKER_IP = deviceByRole('attacker').ip;

function nameForMac(mac: string) {
  return DEVICES.find((d) => d.mac === mac)?.name ?? 'unknown';
}

export default function SpoofingMitmLab() {
  const [arp, setArp] = useState<ArpState>(() => initialArp());
  const [dns, setDns] = useState<DnsState>(() => initialDns());
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const onPath = isOnPath(arp);
  const dupMacs = duplicateMacs(arp);
  const resolved = resolve(dns, PROTECTED_HOST);
  const dnsPoisoned = resolved !== HONEST_IP;

  const runSpoof = () => {
    const r = spoofArp(arp);
    setArp(r.state);
    if (r.succeeded) {
      add(
        evidence(
          'danger',
          'ARP spoof succeeded — attacker is on the path',
          `The gateway IP ${GATEWAY_IP} now resolves to the attacker's MAC. Flag: ${ONPATH_FLAG}`,
        ),
      );
    } else {
      markChallengeSolved('mitm-harden');
      add(
        evidence(
          'success',
          'ARP spoof rejected by dynamic ARP inspection',
          'The unsolicited reply failed validation against the trusted binding.',
        ),
      );
    }
  };

  const toggleDai = () => {
    setArp(enableDai(arp));
    add(
      evidence(
        'info',
        'Enabled dynamic ARP inspection',
        'The honest gateway binding is restored and locked.',
      ),
    );
  };

  const runPoison = () => {
    const r = poisonDns(dns, PROTECTED_HOST, ATTACKER_IP);
    setDns(r.state);
    if (r.succeeded) {
      add(
        evidence(
          'danger',
          'DNS cache poisoned',
          `${PROTECTED_HOST} now resolves to ${ATTACKER_IP}. Flag: ${DNS_POISON_FLAG}`,
        ),
      );
    } else {
      markChallengeSolved('mitm-dnssec');
      add(
        evidence(
          'success',
          'Forged DNS record rejected by DNSSEC',
          `The record failed signature validation; ${PROTECTED_HOST} still resolves to ${HONEST_IP}.`,
        ),
      );
    }
  };

  const toggleDnssec = () => {
    setDns(enableDnssec(dns));
    add(
      evidence('info', 'Enabled DNSSEC', 'Records are now validated against the zone signature.'),
    );
  };

  const reset = () => {
    setArp(initialArp());
    setDns(initialDns());
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        ARP and DNS were designed without authentication. You will abuse both to sit{' '}
        <strong className="text-fg">on the path</strong> between a victim and the network — a
        man-in-the-middle — then enable the defenses that make each attack fail.
      </p>
      <LabSteps
        steps={[
          { title: 'Read the LAN', body: 'Inspect devices and the IP-to-MAC bindings.' },
          { title: 'ARP spoof', body: 'Claim the gateway IP and become the man in the middle.' },
          { title: 'Poison DNS', body: 'Forge a record so a trusted name points at the attacker.' },
          {
            title: 'Inspect ARP',
            body: 'Turn on dynamic ARP inspection and watch the spoof fail.',
          },
          { title: 'Sign DNS', body: 'Turn on DNSSEC and watch the forged record get rejected.' },
        ]}
      />
      <Callout tone="info" title="A model, not a network">
        The LAN, MACs, and DNS cache are fixtures on the reserved <code>192.0.2.0/24</code> range.
        No packets are sent and nothing is resolved — the attack flips flags in the model.
      </Callout>
    </div>
  );

  const workspace = (
    <Tabs defaultValue="arp" className="flex h-full flex-col">
      <TabsList className="shrink-0 px-4 pt-2">
        <TabsTrigger value="arp">ARP</TabsTrigger>
        <TabsTrigger value="dns">DNS</TabsTrigger>
      </TabsList>

      <TabsContent value="arp" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {onPath ? (
                <Badge tone="danger">attacker on-path</Badge>
              ) : (
                <Badge tone="success">path is clean</Badge>
              )}
              {arp.dai && (
                <Badge tone="info" className="gap-1">
                  <ShieldCheck className="size-3.5" aria-hidden /> DAI on
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={runSpoof} className="gap-1.5">
                <Play className="size-3.5" aria-hidden /> Run ARP spoof
              </Button>
              <Button
                size="sm"
                variant={arp.dai ? 'ghost' : 'secondary'}
                disabled={arp.dai}
                onClick={toggleDai}
                className="gap-1.5"
              >
                <ShieldCheck className="size-3.5" aria-hidden />
                {arp.dai ? 'Inspection on' : 'Enable inspection'}
              </Button>
            </div>
          </div>

          <div className="border-line overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-fg-subtle text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">IP address</th>
                  <th className="px-3 py-2 font-medium">Maps to MAC</th>
                  <th className="px-3 py-2 font-medium">Which device</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {Object.entries(arp.table).map(([ip, mac]) => {
                  const spoofed = ip === GATEWAY_IP && dupMacs.includes(mac);
                  return (
                    <tr key={ip} className={cn(spoofed && 'bg-danger-soft')}>
                      <td className="px-3 py-2 font-mono text-xs">{ip}</td>
                      <td className="px-3 py-2 font-mono text-xs">{mac}</td>
                      <td className="px-3 py-2 text-xs">
                        {nameForMac(mac)}
                        {spoofed && (
                          <Badge tone="danger" className="ml-2">
                            spoofed
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {onPath && (
            <div className="border-danger/40 bg-danger-soft text-fg flex items-center gap-2 rounded-lg border p-2 font-mono text-xs">
              <Flag className="text-danger size-4 shrink-0" aria-hidden />
              {ONPATH_FLAG}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="dns" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {dnsPoisoned ? (
                <Badge tone="danger">cache poisoned</Badge>
              ) : (
                <Badge tone="success">cache honest</Badge>
              )}
              {dns.dnssec && (
                <Badge tone="info" className="gap-1">
                  <ShieldCheck className="size-3.5" aria-hidden /> DNSSEC on
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={runPoison} className="gap-1.5">
                <Play className="size-3.5" aria-hidden /> Poison cache
              </Button>
              <Button
                size="sm"
                variant={dns.dnssec ? 'ghost' : 'secondary'}
                disabled={dns.dnssec}
                onClick={toggleDnssec}
                className="gap-1.5"
              >
                <ShieldCheck className="size-3.5" aria-hidden />
                {dns.dnssec ? 'DNSSEC on' : 'Enable DNSSEC'}
              </Button>
            </div>
          </div>

          <div className="border-line overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-fg-subtle text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">Hostname</th>
                  <th className="px-3 py-2 font-medium">Resolves to</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {Object.entries(dns.cache).map(([host, ip]) => (
                  <tr
                    key={host}
                    className={cn(host === PROTECTED_HOST && dnsPoisoned && 'bg-danger-soft')}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{host}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {ip}
                      {host === PROTECTED_HOST && dnsPoisoned && (
                        <Badge tone="danger" className="ml-2">
                          forged
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dnsPoisoned && (
            <div className="border-danger/40 bg-danger-soft text-fg flex items-center gap-2 rounded-lg border p-2 font-mono text-xs">
              <Flag className="text-danger size-4 shrink-0" aria-hidden />
              {DNS_POISON_FLAG}
            </div>
          )}

          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`**Unauthenticated protocols trust whatever they are told.** ARP accepts any reply; plain DNS accepts any answer. The fixes add authentication: dynamic ARP inspection validates bindings against a trusted source, and DNSSEC signs records so forgeries fail a signature check. End-to-end TLS also limits the damage of an on-path attacker, since they cannot read or alter a properly validated TLS session.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={spoofingMitmLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}

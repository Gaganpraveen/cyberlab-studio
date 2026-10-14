---
topicId: CLD-05
title: Orchestration and workload isolation
summary: Kubernetes runs whatever its manifests describe, so a few lines of YAML decide whether a compromised container stays contained or takes over a cluster. Learn the layers that isolate workloads (Pod Security, RBAC, network policies, and resource limits) and how to analyze a deployment manifest against them.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 45
objectives:
  - Describe how a request to create a workload passes through authentication, RBAC authorization, and admission control before any container runs.
  - Classify settings in a Pod specification against the Baseline and Restricted Pod Security Standards.
  - Identify RBAC bindings and missing network policies that let one compromised workload reach the rest of a cluster.
  - Rewrite a deployment manifest so that it passes the Restricted profile and receives only the network access and API permissions it needs.
prerequisites: [CLD-04, IAM-06, NET-07]
concepts: [kubernetes, pod-security, admission-controller, network-policy]
keywords:
  - Kubernetes
  - K8s
  - pod
  - Deployment
  - manifest
  - namespace
  - Pod Security Standards
  - Pod Security Admission
  - PSA
  - securityContext
  - RBAC
  - ClusterRoleBinding
  - cluster-admin
  - service account token
  - NetworkPolicy
  - default deny
  - multi-tenancy
  - NIST SP 800-190
sources:
  - title: Pod Security Standards
    url: https://kubernetes.io/docs/concepts/security/pod-security-standards/
    publisher: The Kubernetes Authors
  - title: Pod Security Admission
    url: https://kubernetes.io/docs/concepts/security/pod-security-admission/
    publisher: The Kubernetes Authors
  - title: Using RBAC Authorization
    url: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
    publisher: The Kubernetes Authors
  - title: Role Based Access Control Good Practices
    url: https://kubernetes.io/docs/concepts/security/rbac-good-practices/
    publisher: The Kubernetes Authors
  - title: Network Policies
    url: https://kubernetes.io/docs/concepts/services-networking/network-policies/
    publisher: The Kubernetes Authors
  - title: 'NIST SP 800-190: Application Container Security Guide'
    url: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-190.pdf
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
quiz:
  - question: A namespace is labeled pod-security.kubernetes.io/enforce=restricted. A developer creates a Deployment whose Pod template sets privileged to true. What happens?
    choices:
      - The Deployment object is rejected before it is stored.
      - The Deployment object can be created, but the Pods it tries to create are rejected, so no replicas start.
      - The Pods start, but their privileged setting is silently removed.
      - Nothing, because Pod Security applies only to Pods created by hand.
    answer: 1
    explanation: Enforce mode applies to the resulting Pod objects, not to workload resources such as Deployments. Warn and audit modes do check workload resources, which is why turning on warn mode helps catch violations early.
  - question: Which statement about Kubernetes namespaces is correct?
    choices:
      - Namespaces are a network boundary, so Pods in different namespaces cannot reach each other.
      - Namespaces give each team its own nodes and kernel.
      - Namespaces block all API access across teams by default.
      - Namespaces scope names and policies; isolation comes only from the RBAC rules, Pod Security labels, and network policies attached to them.
    answer: 3
    explanation: A namespace is an organizing scope, not a wall. Pods in different namespaces can still share nodes and talk over the network unless policies say otherwise.
  - question: The default service account in namespace grades is bound to the cluster-admin ClusterRole, and an attacker gains code execution in a Pod in grades that mounts that account's token. What can the attacker do?
    choices:
      - Act as a cluster administrator through the API, for example reading Secrets or creating privileged Pods in any namespace.
      - Only read the logs of Pods in grades.
      - Nothing, because service account tokens work only from inside kubelet.
      - Only list namespaces, because cluster-admin is a read-only role.
    answer: 0
    explanation: A Pod's mounted token is a credential for its service account, and a ClusterRoleBinding to cluster-admin grants every action on every resource. One compromised Pod becomes a compromised cluster.
  - question: A team applies a NetworkPolicy that denies all ingress to its Pods, but traffic still flows. What is the most likely explanation?
    choices:
      - NetworkPolicy objects always take effect only after the nodes are rebooted.
      - Deny policies in Kubernetes must be written in JSON instead of YAML.
      - The cluster's network plugin does not implement NetworkPolicy, so the object has no effect.
      - Network policies apply only to traffic leaving the cluster.
    answer: 2
    explanation: The Kubernetes API stores the policy, but enforcement is up to the network plugin. Without a plugin that supports NetworkPolicy, the objects change nothing, so always test that policies are enforced.
  - question: Under the Restricted Pod Security Standard, which container setting is allowed?
    choices:
      - Adding the SYS_ADMIN capability.
      - Dropping ALL capabilities and adding back only NET_BIND_SERVICE.
      - Setting seccompProfile type to Unconfined.
      - Setting runAsUser to 0 as long as runAsNonRoot is also set.
    answer: 1
    explanation: Restricted requires dropping ALL capabilities and permits adding back only NET_BIND_SERVICE. It prohibits the Unconfined seccomp profile and forbids runAsUser 0.
---

## Why it matters

Running one container is a matter for one host (see [CLD-04](lesson:CLD-04)). Running hundreds across many machines needs an orchestrator, such as the open-source [[kubernetes|Kubernetes]]. It is declarative: teams describe the state they want in YAML manifests, and the control plane works to make the cluster match. That design turns every manifest into a security policy. If a manifest says a container is privileged, mounts the node's root filesystem, or runs under an account with administrator rights, the cluster carries that out faithfully.

A cluster is also shared. Workloads from different teams, with different sensitivity, run on the same nodes and are managed through the same API. NIST SP 800-190 names the resulting orchestrator risks: unbounded administrative access, unauthorized access, poorly separated network traffic between containers, mixing of workloads with different sensitivity levels, and trust in the orchestrator's nodes. Each one is a way for a single compromised container to become a compromised cluster.

The good news is that Kubernetes provides a control for each layer. The bad news is that most of them do little until someone configures them.

## The core idea

Some vocabulary first. A cluster is a set of machines called nodes. The smallest unit Kubernetes runs is a Pod: one or more containers that share a network identity. A Deployment keeps a chosen number of copies of a Pod running. A namespace groups resources and scopes their names and policies. Every request to change the cluster goes to the API server, and every Pod runs under a [[service-account]], an identity the Pod can use to call that API.

Isolation in a cluster comes from several layers, each answering a different question:

1. **What may a Pod do on its node?** Security settings in the Pod specification, checked by [[pod-security|Pod Security]] admission.
2. **What may an identity do through the API?** [[rbac|Role-based access control (RBAC)]] rules.
3. **Which Pods may talk to which?** [[network-policy|Network policies]].
4. **How much may a Pod use?** Resource requests and limits.
5. **Where does a workload run?** Node placement, so that sensitive and untrusted workloads do not share a kernel.

Think of a shared laboratory building. The front desk checks badges (RBAC). A safety office decides what equipment each lab may install (Pod Security). Locked doors separate the labs (network policies), and each lab has a power budget (resource limits). A namespace is a room number on a door: useful for organizing, but it separates nothing unless rules are attached to it.

The layers rest on assumptions: the API server is the only way to change the cluster, nodes and the control plane are themselves patched and protected, and the images being run are the ones that were reviewed (see [CLD-07](lesson:CLD-07)).

## How it works

### From request to running container

The diagram follows Bob as he creates a workload in a namespace labeled to enforce, and warn about, the Restricted profile. The API server first authenticates him and checks RBAC. The Deployment is stored with a warning, but the Pods it generates must still pass admission, where Pod Security rejects a non-compliant template. Only an admitted Pod is scheduled onto a node.

```sequence
title: Creating a workload where Restricted is enforced and warned
participant U as Bob, kubectl
participant API as API server
participant C as Deployment controller
participant N as Node kubelet
U -> API: Create Deployment gradebook in grades
note API: Authenticate Bob; RBAC: may he create it?
API --> U: Created, with a Pod Security warning
C -> API: Create Pod from the template
API -x C: Pod rejected: violates Restricted profile
note: Bob fixes the template; the new Pod is admitted
API -> N: Schedule Pod; kubelet starts its containers
```

An [[admission-controller]] is a plug-in that inspects, and can reject or modify, requests after authorization and before objects are stored. Pod Security Admission is one built into Kubernetes; policy engines add custom rules the same way.

### Pod Security Standards

The Kubernetes Pod Security Standards define three profiles. Privileged is an "Unrestricted policy, providing the widest possible level of permissions." Baseline is a "Minimally restrictive policy which prevents known privilege escalations." Restricted is a "Heavily restricted policy, following current Pod hardening best practices."

| Control                    | Baseline requires                    | Restricted adds                                         |
| -------------------------- | ------------------------------------ | ------------------------------------------------------- |
| Host namespaces            | `hostNetwork`, `hostPID`, `hostIPC` unset or false | (same)                                      |
| Privileged containers      | `privileged` unset or false          | (same)                                                  |
| HostPath volumes           | Not allowed                          | Only a short list of volume types                       |
| Host ports                 | Unset or 0                           | (same)                                                  |
| Privilege escalation       | Not checked                          | `allowPrivilegeEscalation: false`                       |
| Running as non-root        | Not checked                          | `runAsNonRoot: true`, and `runAsUser` never 0           |
| seccomp                    | Not `Unconfined`                     | `RuntimeDefault` or `Localhost` must be set             |
| Capabilities               | Only a default set                   | Drop `ALL`; only `NET_BIND_SERVICE` may be added        |

Pod Security Admission applies a profile per namespace through labels of the form `pod-security.kubernetes.io/<MODE>: <LEVEL>`. In enforce mode, "Policy violations will cause the pod to be rejected." In warn mode, violations produce a user-facing warning, and in audit mode they are recorded in the audit log. One detail surprises people: enforce mode "is not applied to workload resources, only to the resulting pod objects," while warn and audit also check workload resources such as Deployments.

### RBAC: who may do what through the API

A Role (within one namespace) or ClusterRole (cluster-wide) lists verbs, such as `get`, `list`, or `create`, on resources, such as Pods or Secrets. A RoleBinding or ClusterRoleBinding grants a role to users, groups, or service accounts. In the documentation's words, "Permissions are purely additive (there are no "deny" rules)," so the only way to remove access is to remove a grant. Several permissions are more powerful than they look:

- **Reading Secrets** reveals every credential stored in the namespace.
- **Creating Pods** lets a principal run a Pod that mounts any Secret or uses any service account in that namespace, so it implies those permissions too.
- **Binding roles or escalating** lets a principal grant itself more.
- **Wildcards** (`*` for verbs or resources) grant everything, including resource types added later.

### Network policies

By default, a Pod is non-isolated: Kubernetes allows all of its inbound and all of its outbound connections, so without network policies any Pod can try to reach any other. A NetworkPolicy selects Pods and allows specific ingress or egress traffic; once a Pod is selected by a policy for a direction, only explicitly allowed traffic in that direction reaches it. Policies are enforced by the cluster's network plugin, so a cluster whose plugin does not support them accepts the objects and changes nothing.

## Worked example

Alice reviews this fictional fixture before the `gradebook` service moves into the shared campus cluster.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gradebook
  namespace: grades
spec:
  replicas: 2
  selector:
    matchLabels: { app: gradebook }
  template:
    metadata:
      labels: { app: gradebook }
    spec:
      hostNetwork: true
      containers:
        - name: api
          image: registry.example/gradebook-api:latest
          securityContext:
            privileged: true
          volumeMounts:
            - { name: host-root, mountPath: /host }
      volumes:
        - name: host-root
          hostPath: { path: / }
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: gradebook-admin
subjects:
  - { kind: ServiceAccount, name: default, namespace: grades }
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
```

**Step 1: Check the Pod against the profiles.**

| Finding                                   | Rule it breaks                | Consequence if the app is compromised             |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------- |
| `hostNetwork: true`                       | Baseline: host namespaces     | Sees the node's interfaces and local services     |
| `privileged: true`                        | Baseline: privileged          | All capabilities and the node's devices           |
| `hostPath` of `/`                         | Baseline: HostPath volumes    | Reads and writes the node's whole filesystem      |
| No non-root, seccomp, or capability rules | Restricted                    | Runs as root with default powers                  |
| `:latest` image tag                       | Not a Pod Security control    | Unreviewed image may run (see CLD-04)             |
| No resource limits                        | Not a Pod Security control    | One Pod can starve its neighbors                  |

**Step 2: Check identity.** The ClusterRoleBinding gives the namespace's default service account the `cluster-admin` role, and every Pod in `grades` that does not name another account runs as that default. A single code-execution flaw in the API would hand an attacker the cluster: the container is privileged with the node's filesystem mounted, and its token is a cluster administrator's credential.

**Step 3: Check the network.** There is no NetworkPolicy in `grades`, so every Pod in the cluster can reach the API, and the API can reach every Pod.

**Step 4: Rewrite.** Alice removes the ClusterRoleBinding (the service calls no Kubernetes APIs), creates a dedicated service account without an automatically mounted token, labels the namespace, and rewrites the Pod template:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: grades
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gradebook
  namespace: grades
automountServiceAccountToken: false
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gradebook
  namespace: grades
spec:
  replicas: 2
  selector:
    matchLabels: { app: gradebook }
  template:
    metadata:
      labels: { app: gradebook }
    spec:
      serviceAccountName: gradebook
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: api
          image: registry.example/gradebook-api@sha256:<reviewed-digest>
          ports:
            - containerPort: 8080
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits: { memory: 256Mi }
```

**Step 5: Add network policy.** A default-deny policy isolates every Pod in the namespace, and a second policy admits traffic to the API only from the campus gateway's namespace on port 8080. Because egress is denied too, the team adds narrow egress rules for DNS and the database (not shown) and tests that the plugin enforces all of them.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: grades
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: gradebook-from-gateway
  namespace: grades
spec:
  podSelector:
    matchLabels: { app: gradebook }
  policyTypes: [Ingress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: gateway }
      ports:
        - { protocol: TCP, port: 8080 }
```

**Step 6: Record what remains.** The Pods still share nodes with other teams' workloads, and a kernel flaw could cross that boundary. Because grades are sensitive, Alice asks for the namespace to be scheduled onto nodes reserved for sensitive workloads, following NIST's advice to group containers by sensitivity.

## Defenses

- **Enforce Pod Security on every namespace.** Use Restricted where possible and Baseline at minimum, and roll out with warn mode first. The limit: admission checks the specification once, at creation; it does not watch runtime behavior, and anyone allowed to relabel a namespace can weaken it.
- **Write least-privilege RBAC.** Grant roles per namespace, avoid wildcards and `cluster-admin`, give each workload its own service account, and turn off token mounting for workloads that never call the API. The limit: RBAC has no deny rules, so review bindings regularly; a single broad grant cancels careful ones.
- **Default-deny network traffic.** Start from deny-all in each namespace and allow specific flows. The limit: enforcement depends on the network plugin, and policies work on addresses and ports, not on the content of requests.
- **Set resource requests and limits.** They keep one compromised or buggy Pod from starving others, a basic availability control.
- **Separate by sensitivity.** Keep high-sensitivity workloads on dedicated nodes, or in a separate cluster when the risk warrants it.
- **Protect the control plane.** Keep the API server off the public internet where possible, turn on audit logging, and keep Kubernetes and node software patched.

## Common misconceptions

- **"Namespaces isolate workloads."** They scope names and policies. Without RBAC, Pod Security labels, and network policies, workloads in different namespaces can still reach one another and share nodes.
- **"If enforce mode is on, a bad Deployment will be rejected."** The Deployment is stored; its Pods are rejected. Watch for warnings and missing replicas.
- **"Creating a NetworkPolicy is enough."** Only a network plugin that supports policies enforces them. Test, do not assume.
- **"We can add an RBAC rule that denies access."** RBAC only grants. Remove the broader grant instead.
- **"Our service account is harmless because the app never calls the API."** If its token is mounted, an attacker who compromises the app can use it.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

**On paper.** Analyze this fixture. For each problem, name the Pod Security control or RBAC practice it breaks and write the fix.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
  namespace: reports
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          hostPID: true
          containers:
            - name: report
              image: registry.example/report:latest
              securityContext:
                runAsUser: 0
                capabilities: { add: ["SYS_PTRACE"] }
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: report-reader
  namespace: reports
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list"]
```

Questions: Which settings fail Baseline, and which fail only Restricted? Why is `get` and `list` on every resource dangerous even though it is read-only? What would you add so that the job can reach only its database?

**On your own local cluster (optional).** If you run a practice cluster on your own computer, create a test namespace labeled `pod-security.kubernetes.io/warn: restricted`, apply the original `gradebook` Deployment, and read the warnings. Then apply the fixed version and confirm the warnings disappear.

## Key takeaways

- In Kubernetes, manifests are security policy: the cluster runs exactly what they describe.
- Isolation comes from layers: Pod Security for node-level powers, RBAC for API permissions, network policies for traffic, limits for resources, and placement for shared kernels.
- Pod Security's Restricted profile requires non-root users, no privilege escalation, a seccomp profile, and dropping all capabilities.
- RBAC only grants, so avoid wildcards and cluster-admin, use one service account per workload, and do not mount tokens a workload does not need.
- Network policies take effect only with a supporting plugin; start from default deny and allow specific flows.

## Go deeper

- Read the full Pod Security Standards, including the volume types Restricted allows, and the Pod Security Admission page on exemptions and version pinning.
- NIST SP 800-190 Section 4 pairs each orchestrator risk with countermeasures, including grouping workloads by sensitivity.
- Open question: a namespace-per-team model shares nodes and the control plane among tenants. When is that sufficient, and what evidence would justify paying for separate clusters?

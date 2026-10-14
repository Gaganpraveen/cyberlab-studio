---
topicId: CLD-04
title: Container images and runtime hardening
summary: A container is an ordinary process that the kernel walls off, packaged from an image that may carry vulnerabilities and secrets into every environment. Learn what isolates a container, what breaks that isolation, and how to review an image and its runtime settings against best practices.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Explain how namespaces, control groups, capabilities, and seccomp isolate a container, and why containers on one host share a kernel.
  - Identify risky patterns in a Dockerfile, such as mutable tags, embedded secrets, unneeded tools, and a root default user.
  - Rewrite an image build and a run command so that the container runs as a non-root user with minimal privileges.
  - Evaluate which runtime settings, such as privileged mode or a mounted daemon socket, effectively give a container control of its host.
prerequisites: [SYS-04, SYS-05, CLD-01]
concepts: [container, container-image, image-digest, linux-namespace, cgroup, linux-capability, seccomp, privileged-container, container-escape]
keywords:
  - Docker
  - Dockerfile
  - OCI image
  - container runtime
  - runc
  - containerd
  - image hardening
  - distroless
  - multi-stage build
  - rootless containers
  - non-root user
  - capabilities
  - CAP_SYS_ADMIN
  - seccomp
  - AppArmor
  - SELinux
  - no-new-privileges
  - container escape
  - container breakout
  - NIST SP 800-190
sources:
  - title: 'NIST SP 800-190: Application Container Security Guide'
    url: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-190.pdf
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: OWASP Docker Security Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: Build secrets (Docker Docs)
    url: https://docs.docker.com/build/building/secrets/
    publisher: Docker Inc.
  - title: docker container run (Docker CLI reference)
    url: https://docs.docker.com/reference/cli/docker/container/run/
    publisher: Docker Inc.
  - title: CVE-2019-5736 Detail
    url: https://nvd.nist.gov/vuln/detail/CVE-2019-5736
    publisher: NIST National Vulnerability Database
quiz:
  - question: Two containers run on the same Linux host. Which statement about their isolation is correct?
    choices:
      - Each container runs its own kernel, so a kernel bug affects only one container.
      - Both containers are processes on the same host kernel, which uses namespaces, control groups, and other features to limit them, so a kernel flaw can affect both.
      - Containers are isolated by the CPU's hardware virtualization, exactly like virtual machines.
      - Containers are isolated only by the firewall between them.
    answer: 1
    explanation: Containers share the host kernel. Namespaces limit what each process can see, and control groups, capabilities, and seccomp limit what it can use and do. A flaw in the shared kernel or runtime can cross every container boundary on that host.
  - question: A Dockerfile copies a file with a database password into the image in one step and deletes the file in a later step. Is the password gone from the image?
    choices:
      - Yes, because the final filesystem no longer contains the file.
      - Yes, as long as the image is pushed with a new tag.
      - No, because each instruction adds a layer, and the earlier layer that contains the file is still part of the image.
      - No, but only because the password also appears in the container's logs.
    answer: 2
    explanation: Image layers stack. A later deletion hides the file from the final view but leaves it in the earlier layer, which anyone who can pull the image can extract. Keep secrets out of images and provide them at runtime.
  - question: Why is running a container with docker run --privileged dangerous even if the application inside is trustworthy?
    choices:
      - Privileged mode gives the container every Linux capability and access to the host's devices, so whoever compromises the application gains a short path to controlling the host.
      - Privileged mode makes the image larger, which slows deployment.
      - Privileged mode disables the container's network.
      - Privileged mode only affects logging, so it is not dangerous.
    answer: 0
    explanation: NIST SP 800-190 notes that a container in privileged mode "has access to all the devices on the host." Hardening assumes the application may be compromised one day; privileged mode turns that compromise into a host compromise.
  - question: A web service listens on port 8080 and never changes file ownership or network settings. Which capability setting fits least privilege?
    choices:
      - Keep the runtime's default capabilities, because they are already minimal.
      - Add CAP_SYS_ADMIN so that the service never fails unexpectedly.
      - Run the container as root so that capabilities do not matter.
      - Drop all capabilities, because a non-root process can bind a port above 1024 without any of them.
    answer: 3
    explanation: Ports above 1024 need no special privilege, so this service needs no capabilities at all. Dropping all of them and adding back only what a test proves necessary is the least-privilege pattern.
  - question: A team pins its base image by digest. Six months later, a scanner reports critical vulnerabilities in that base image. What does this show?
    choices:
      - Digest pinning was a mistake and should be replaced by the latest tag.
      - Pinning makes builds reproducible, but the team must still rebuild on a patched base and update the pinned digest on a schedule.
      - The scanner must be wrong, because a pinned image cannot change.
      - Vulnerabilities in a base image cannot affect the application.
    answer: 1
    explanation: A digest guarantees you get the exact image you reviewed. It does not keep that image current. Pinning plus a regular, deliberate update process gives both reproducibility and patching.
---

## Why it matters

A [[container]] packages an application together with its libraries and settings so that the same artifact runs on a laptop, in a test pipeline, and in production. That convenience cuts both ways. The [[container-image]] the team builds once is copied into every environment, so any vulnerable package or embedded password in it is copied too. And the settings used to run the container decide how far an attacker can go after compromising the application inside.

NIST SP 800-190, NIST's guide to container security, sorts the risks into five groups: risks in images, registries, orchestrators, containers, and the host operating system. Its image risks read like a review checklist: vulnerable components, configuration defects, embedded malware, embedded clear-text secrets, and untrusted images. Its container risks include vulnerabilities in the runtime software itself and insecure runtime configurations.

The second group matters because the wall around a container is software. A flaw in runc, the low-level runtime that Docker and other tools use to start containers, let a process running as root inside a container overwrite the host's runc program and so gain root on the host. Tracked as CVE-2019-5736, it required the attacker to run a command as root in a container, either from an image they controlled or in an existing container they could already write to. Patching the runtime fixed the bug, and running containers as a non-root user would have made the attack much harder. That pairing, keeping the platform patched and assuming the wall might fail, is the theme of this lesson.

## The core idea

A container is not a small virtual machine. It is an ordinary Linux process to which the kernel gives a restricted view and a restricted set of powers. Every container on a host shares that host's kernel. A virtual machine is like a separate house with its own foundation; containers are rooms partitioned inside one house. The partitions are sturdy, but they all stand on the same foundation, so anyone who gets into the foundation can reach every room.

The kernel builds the partitions from several independent features:

- [[linux-namespace|Namespaces]] limit what a process can see: its own process list, mount points, network interfaces, hostname, and user IDs.
- [[cgroup|Control groups (cgroups)]] limit how much it can use: memory, CPU time, and the number of processes.
- [[linux-capability|Capabilities]] split the all-powerful root account into separate privileges, such as binding to low ports or administering the network, so that a process can keep only the ones it needs.
- [[seccomp]] filters which system calls a process may make at all.
- Linux security modules, such as AppArmor and SELinux, enforce policies about which files and operations a process may use.

An image is a stack of read-only filesystem layers plus metadata: the default user, the start command, environment variables, and exposed ports. It is named by a tag, such as `python:3.12-slim`, which its publisher can move to new content, or by an [[image-digest]], a hash of the content that can never point to anything else.

Hardening has two halves. Build a small, trusted, secret-free image that runs as a non-root user. Then run it with the fewest powers that still let it work. Both halves rest on assumptions worth stating: the host kernel and container runtime are patched, the image you run is the one you reviewed, and whatever starts the container (a person or an orchestrator, see [CLD-05](lesson:CLD-05)) applies the settings you chose.

## How it works

### Layers remember everything

Each instruction in a Dockerfile, such as `COPY` or `RUN`, adds a layer. Deleting a file in a later instruction hides it from the final filesystem but leaves it inside the earlier layer, and anyone who can pull the image can extract every layer. Environment variables set with `ENV` are stored in the image's metadata, where image inspection tools display them. Docker's documentation warns that build arguments and environment variables "are inappropriate for passing secrets to your build" because "they persist in the final image," and it recommends secret mounts, which expose a secret to one build step without writing it into a layer. NIST SP 800-190 states the rule plainly: "Secrets should be stored outside of images and provided dynamically at runtime as needed."

### Settings that tighten isolation

| Feature             | What it limits                         | Hardened setting                                       |
| ------------------- | -------------------------------------- | ------------------------------------------------------ |
| User                | Whether the process is root            | A numeric non-root user set in the image (`USER`)      |
| Capabilities        | Which root powers remain               | Drop all, then add back only what a test proves needed |
| No new privileges   | Gaining privileges via setuid programs | Turn on the `no-new-privileges` option                 |
| seccomp             | Which system calls are allowed         | Keep the runtime's default profile; never "unconfined" |
| Root filesystem     | Whether the process can modify its own files | Read-only, with a small writable temporary area  |
| Control groups      | Memory, CPU, and process count         | Explicit limits, so one container cannot starve others |

### Settings that break isolation

Some options quietly remove the partitions:

- **Privileged mode.** A [[privileged-container]] receives every capability and access to host devices. The OWASP Docker cheat sheet warns that the flag "will add ALL Linux kernel capabilities to the container," and NIST SP 800-190 notes that a privileged container "has access to all the devices on the host."
- **Mounting the container daemon's socket.** A process that can talk to the daemon can ask it to start a new privileged container with the host's filesystem mounted. OWASP puts it bluntly: giving someone access to the socket "is equivalent to giving unrestricted root access to your host."
- **Host namespaces and host directories.** Sharing the host's network or process namespace, or mounting sensitive host directories such as `/etc`, gives the container a direct view of the host.
- **Running as root.** Container root is the host's user ID 0 unless user namespaces remap it. Capabilities and seccomp limit it, but a runtime or kernel bug, as in CVE-2019-5736, can turn it into full host root.

Any path that lets a process leave its partitions and act on the host is called a [[container-escape]]. Privileged mode and a mounted daemon socket are escape paths in themselves. The other settings decide how much an attacker gains when a kernel or runtime flaw opens one.

## Worked example

Alice is asked to review the image and run command for a fictional teaching service, `gradebook-api`, before it moves to production. Here is the Dockerfile she receives:

```dockerfile
FROM registry.example/base/python:latest
WORKDIR /app
COPY . .
ENV DB_PASSWORD=Spring2026!
RUN apt-get update && apt-get install -y gcc curl vim
RUN pip install -r requirements.txt
EXPOSE 8080
CMD ["python", "app.py"]
```

And here is how the team runs it today:

```bash
docker run -d --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --network host \
  registry.example/gradebook-api:latest
```

**Step 1: Review the image.** Alice lists each finding with its risk.

| Finding                                  | Risk                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `FROM .../python:latest`                 | The tag can move; tomorrow's build may use an image nobody reviewed  |
| `COPY . .` with no ignore file           | Copies everything in the folder, possibly `.git` history or `.env` files |
| `ENV DB_PASSWORD=...`                    | The password is stored in image metadata for anyone who pulls it      |
| `gcc`, `curl`, `vim` in the final image  | More packages to patch, and ready-made tools for an intruder          |
| No `USER` instruction                    | The service runs as root inside the container                        |

**Step 2: Review the run command.** Each of its three flags removes a partition: privileged mode grants every capability and the host's devices, the mounted daemon socket lets the container start new privileged containers, and the host network namespace exposes every host interface. Combined with a root user, a single flaw in the app would hand an attacker the host.

**Step 3: Rebuild the image.** A multi-stage build compiles dependencies in a throwaway stage and copies only the results into a slim runtime stage. The base is pinned by digest (shown as a placeholder), the password is gone, and the service runs as an unprivileged user. A `.dockerignore` file excludes `.git`, `.env`, and test data from the build context.

```dockerfile
# Build stage: has compilers, never shipped
FROM registry.example/base/python:3.12-slim@sha256:<reviewed-digest> AS build
WORKDIR /src
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt
COPY app/ ./app/

# Runtime stage: only what the service needs
FROM registry.example/base/python:3.12-slim@sha256:<reviewed-digest>
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin appuser
COPY --from=build /install /usr/local
COPY --from=build /src/app /app
USER 10001
WORKDIR /
EXPOSE 8080
CMD ["python", "-m", "app"]
```

**Step 4: Tighten the runtime.** The database password now comes from the platform's secret store at start time. The new run command drops every capability, because a service on port 8080 needs none, blocks privilege gain through setuid programs, makes the root filesystem read-only with a small temporary area, and sets resource limits. The default seccomp profile stays on because nothing disables it.

```bash
docker run -d \
  --user 10001 \
  --cap-drop ALL \
  --security-opt=no-new-privileges \
  --read-only --tmpfs /tmp \
  --memory 256m --pids-limit 100 \
  -p 8080:8080 \
  registry.example/gradebook-api@sha256:<reviewed-digest>
```

**Step 5: Test, then record residual risk.** Alice runs the service's tests against the hardened container. One test fails because the app writes a cache file under `/app`; the team moves the cache to `/tmp` instead of loosening the filesystem. The remaining risks she records: the shared kernel, the runtime's own vulnerabilities, and vulnerabilities in Python packages, which the team's image scanner and patch schedule must cover.

## Defenses

- **Start small and trusted.** Use a minimal base image from a source you trust, pinned by digest. NIST SP 800-190 recommends keeping a list of trusted images and registries and verifying signatures before running them (see [CLD-07](lesson:CLD-07)). The limit: a minimal image still ages, so rebuild on patched bases on a schedule.
- **Scan and gate images.** Container-aware vulnerability tools can block images that exceed a severity threshold. The limit: scanners recognize known vulnerabilities in packages they can identify, so code copied in without package metadata is invisible to them, and many findings may not be reachable.
- **Keep secrets out of images.** Inject them at runtime, only into the containers that need them.
- **Run as non-root.** Set a numeric `USER` in the image; NIST says images "should be configured to run as non-privileged users." Rootless runtimes and user-namespace remapping go further by making container root an unprivileged host user.
- **Drop powers at runtime.** Drop all capabilities, turn on no-new-privileges, keep the default seccomp and security-module profiles, use a read-only root filesystem, and set resource limits. The limit: each setting is easy to undo with one flag, so enforce them with policy rather than habit (see [CLD-05](lesson:CLD-05)).
- **Never grant host control casually.** Avoid privileged mode, the daemon socket, host namespaces, and sensitive host mounts. When a tool truly needs one, isolate it on a dedicated host.
- **Patch the host and runtime, and group by sensitivity.** NIST recommends container-specific host operating systems with minimal functionality, and grouping containers so that each host kernel runs workloads of one sensitivity level.

## Common misconceptions

- **"Containers are lightweight virtual machines."** They share the host kernel. A kernel or runtime flaw can cross every container boundary on the host.
- **"Root inside a container is harmless."** Without user-namespace remapping, it is the host's root user with some powers removed, and one bug away from all of them.
- **"Deleting a secret in a later step removes it."** Earlier layers keep the file. Rebuild without it, and rotate the secret.
- **"A digest-pinned image is secure forever."** Pinning gives you exactly what you reviewed, including its vulnerabilities as they are discovered. Update deliberately and often.
- **"A clean scan means no vulnerabilities."** It means no known vulnerabilities in the packages the scanner recognized.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

**On paper.** Review this teaching image and run command. List every finding, the risk, and a fix, using the tables in the worked example as a model.

```dockerfile
FROM registry.example/base/node:latest
COPY . /srv
WORKDIR /srv
ARG NPM_TOKEN
RUN echo "//registry.example/:_authToken=${NPM_TOKEN}" > /root/.npmrc
RUN npm install && rm /root/.npmrc
CMD ["node", "server.js"]
```

```bash
docker run -d -v /:/host --cap-add SYS_ADMIN registry.example/club-site:latest
```

Hints: think about which layers still hold the token after the `rm`, which user runs the server, what the `/:/host` mount exposes, and why `SYS_ADMIN` is often described as nearly equivalent to root.

**On your own machine (optional).** If you have Docker installed, build a small image of your own and inspect it. `docker image inspect` shows its configured user (an empty value means root), and `docker history` lists its layers. Then run it with `--cap-drop ALL --read-only` and note exactly what breaks. Fix each break in the image, not by loosening the flags.

## Key takeaways

- A container is a process on a shared kernel, walled off by namespaces, control groups, capabilities, seccomp, and security modules.
- Image layers keep everything ever added, so secrets never belong in an image; inject them at runtime.
- Build small, pinned, non-root images, and rebuild them on patched bases on a schedule.
- Run containers with all capabilities dropped, no new privileges, a read-only root filesystem, the default seccomp profile, and resource limits.
- Privileged mode, the daemon socket, host namespaces, and sensitive host mounts each hand the host to whoever controls the container.

## Go deeper

- Read Sections 3 and 4 of NIST SP 800-190, which pair each risk with countermeasures, including orchestrator and registry risks this lesson only names.
- Study CVE-2019-5736 as a case of a runtime flaw. Which of the hardening settings in this lesson would have blocked or limited it, and which would not?
- Open question: user namespaces, rootless runtimes, and sandboxed runtimes trade compatibility for stronger isolation. How would you measure whether the extra isolation is worth the operational cost for a given workload?

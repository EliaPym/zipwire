function logStates(name: string, pc: RTCPeerConnection) {
    pc.addEventListener("signalingstatechange", () => console.log(name, "signaling:", pc.signalingState));
    pc.addEventListener("icegatheringstatechange", () => console.log(name, "ICE Gathering:", pc.iceGatheringState));
    pc.addEventListener("iceconnectionstatechange", () => console.log(name, "ICE Connection:", pc.iceConnectionState));
    pc.addEventListener("connectionstatechange", () => console.log(name, "connection:", pc.connectionState));
}

async function session() {
    const lc = new RTCPeerConnection();
    const rc = new RTCPeerConnection();

    logStates("lc", lc);
    logStates("rc", rc);

    lc.addEventListener("icecandidate", (e) => {
        if (!e.candidate) return;
        console.log("lc candidate:", e.candidate?.candidate);
        rc.addIceCandidate(e.candidate);
    });

    rc.addEventListener("icecandidate", (e) => {
        if (!e.candidate) return;
        console.log("rc candidate:", e.candidate?.candidate);
        lc.addIceCandidate(e.candidate);
    });
    
    const channel = lc.createDataChannel("loopback");
    channel.addEventListener("open", () => {
        console.log("lc channel open");
        channel.send("Hello World");
    })

    rc.addEventListener("datachannel", (e) => {
        e.channel.addEventListener("open", () => {
            console.log("rc channel open")
        });
        e.channel.addEventListener("message", (m) => {
            console.log("rc received", m.data)
        });
    })

    const offer = await lc.createOffer();
    await lc.setLocalDescription(offer);
    await rc.setRemoteDescription(offer);
    console.log(offer.sdp);

    const answer = await rc.createAnswer();
    await rc.setLocalDescription(answer);
    await lc.setRemoteDescription(answer);
}

session().catch(console.error);

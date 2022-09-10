
const socket = io();
//io() function이 알아서 socket.io를 실행하고 있는 서버를 찾는다. 
const socket2 = io();

//html 가져오는 부분
const myFace = document.getElementById('myFace');
const muteBtn = document.getElementById('mute');
let cameraBtn = document.getElementById('camera');
const screenBtn = document.getElementById('screen')
const camersSelect = document.getElementById('cameras');
const microphoneSelect = document.getElementById('microphone');
const screenShare = document.getElementById('screenShare')
let senders = [];
let myStream;
let screenStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let pcObj = {};

//안녕

//내 오디어 비디오 가져옴
async function getMedia(deviceId) {
    const initialConstraints = {
        audio: true,
        video: { facingMode: 'user' },
    };
    // const camerConstraints = {
    //     audio: true,
    //     video: { deviceId: { exact: deviceId } },
    // };
    // deviceId ? camerConstraints : initialConstraints
    try {
        myStream = await navigator.mediaDevices.getUserMedia(initialConstraints)
        // myFace.volume = 0
        paintMyFace(myStream);
        // myFace.srcObject = myStream;
        if (!deviceId) {
            await getCamers();
        }
        console.log('오디오 가져올때 에러나나?')
        await getAudios()
    } catch (err) {
        console.log(err);
    }
}

async function getShareScreenMedia(deviceId) {
    const initialConstraints = {
        audio: true,
        video: true
    };

    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia(initialConstraints)
        // paintMyShareVideo(screenStream);
        screenShare.srcObject = screenStream;

        console.log("나 소켓 있어?", socket2.id)
        makeConnection(socket2.id);


    } catch (err) {
        console.log(err);
    }
}



async function paintMyFace(myStream) {
    try {
        console.log("그리기!")

        const myvideoGrid = document.querySelector('#myvideo-grid')
        const video = document.createElement('video')
        const div = document.createElement('div')
        video.autoplay = true;
        video.playsInline = true;
        myStream.volume = 0
        video.srcObject = myStream
        div.appendChild(video)
        myvideoGrid.appendChild(div);
    } catch (err) {
        console.log(err)
    }
}



function handleMuteBtn() {
    // 내 오디오 장치 가져옴
    console.log('내 오디오 장치', myStream.getAudioTracks());
    myStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));

    if (!muted) {
        muteBtn.innerText = '음소거 해제';
        muted = true;
    } else {
        muteBtn.innerText = '음소거';
        muted = false;
    }
}

function handleCamerBtn() {
    //내 비디오 장치 가져옴
    console.log('내 비디오', myStream.getVideoTracks());
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));

    if (!cameraOff) {
        cameraBtn.innerText = ' 카메라 켜기';
        cameraOff = true;
    } else {
        cameraBtn.innerText = '카메라 끄기';
        cameraOff = false;
    }
}
async function getAudios() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter((device) => device.kind === 'audioinput')
        const currentMic = myStream.getAudioTracks();
        console.log("오디오 가져온달", myStream.getAudioTracks());
        audios.forEach((audio) => {
            const option = document.createElement('option');
            option.value = audio.deviceId;
            option.innerText = audio.label;
            if (currentMic.label == audios.label) {
                option.selected = true;
            }
            microphoneSelect.appendChild(option)
        })
        console.log("오디오", audios)
    } catch (err) {
        console.log(err)
    }
}

//내 카메라 정보를 모두 가져옴 (카메라를 바꿀 때 필요함 )
async function getCamers() {
    try {
        //모든 장치를 가지고 온다.
        const devices = await navigator.mediaDevices.enumerateDevices();
        //내 비디오 찾기
        const camers = devices.filter((device) => device.kind === 'videoinput');
        console.log("카메라만", camers)
        const currentCamera = myStream.getVideoTracks()[0];
        camers.forEach((camera) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label == camera.label) {
                option.selected = true;
            }
            camersSelect.appendChild(option);
        });
        console.log(camers);
    } catch (e) {
        console.log(e);
    }
}

//카메라를 선택할 수 있음
async function handleCameraChange() {
    await getMedia(camersSelect.value);
    if (myPeerConnection) {
        const vidoeTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
            .getSenders()
            .find((sender) => sender.track.kind === 'video');
        videoSender.replaceTrack(vidoeTrack);
    }
}

async function handleMicroChange() {
    await getMedia(microphoneSelect.value);

}

// const displayMediaStreamConstraints = {
//     video: true // or pass HINTS
// };

// if (navigator.mediaDevices.getDisplayMedia) {
//     navigator.mediaDevices.getDisplayMedia(displayMediaStreamConstraints).then(success).catch(error);
// } else {
//     navigator.getDisplayMedia(displayMediaStreamConstraints).then(success).catch(error);
// }





//음소거, 카메라 버튼
muteBtn.addEventListener('click', handleMuteBtn);
cameraBtn.addEventListener('click', handleCamerBtn);
screenBtn.addEventListener('click', shareScreen);
camersSelect.addEventListener('input', handleCameraChange);
microphoneSelect.addEventListener('input', handleMicroChange);

//================여기까지 장치 관련된 코드

//---------------------------- 방에 들어가는 것 관련된 코드 (WELCOME FORM )
const welcome = document.getElementById('welcome');
const call = document.getElementById('call');
welcomeForm = welcome.querySelector('form');
// const form = welcome.querySelector('form')

call.hidden = true;

//양쪽 브라우저에서 다 실행됨
async function initMedia() {
    welcome.hidden = true;
    call.hidden = false;
    // 내 장치(카메라 오디오)를 가져옴
    await getMedia();
    makeConnection(socket.id);
}

//방 이름 넣고 방에 들어가기
async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector('input');
    //백엔드로 join_room 이벤트로 보내면 같은 이름의 이벤트로 받는다.
    //방에 들어가기 전에 내 장치 가져옴
    await initMedia();
    console.log('방에 들어간다');
    socket.emit('join_room', input.value);
    roomName = input.value;
    input.value = '';
}

welcomeForm.addEventListener('submit', handleWelcomeSubmit);

//--------------SOCKET 관련된 코드

//먼저 들어온 사람(서호진)
socket.on('welcome', async (userObjArr, socketIdformserver) => {
    console.log("누구야?", userObjArr)
    console.log("누구 소켓 ?", socketIdformserver)
    const len = userObjArr.length;
    console.log("들어있는 사람들 수", len)
    // console.log("새로 들어온 사람 id", socketIdformserver)

    //누군가 들어왔을 때 실행
    if (len === 2) {
        return;
    }
    for (let i = 0; i < len - 1; i++) {
        console.log('누군가 들어왔어요!');
        //가장 최근에 들어온 브라우저 제외

        try {
            //RTCPerrconnection생성
            console.log("번호", i)


            //누군가 들어왔을 때 나 빼고 다른 사람을 피어연결해준다. 
            const newPc = makeConnection(
                userObjArr[i].socketId,
            );
            console.log('담에 들어온 사람 ', userObjArr[i].socketId,)
            //첨 있던 애가 offer 만들고
            const offer = await myPeerConnection.createOffer();
            //새로 들어온 애가 그 offer set
            await newPc.setLocalDescription(offer)
            console.log('offer 보냄')
            socket.emit('offer', offer, userObjArr[i].socketId);
        } catch (err) {
            console.log(err)
        }
    }

    // myPeerConnection.setLocalDescription(offer);
});

//나중에 들어온 사람 
socket.on('offer', async (offer, remoteSocketId) => {
    try {

        console.log("내 offer랑 socketId", remoteSocketId)
        //이건 서호진 offer
        //이거 아직 없음 왜냐하면 존나 빨라서
        //들어온애 피어연결
        const newPc = makeConnection(remoteSocketId)
        await newPc.setRemoteDescription(offer);
        //학선님 answer
        console.log('나중에 들어온 애 answer 만듬 ')
        const answer = await newPc.createAnswer();
        console.log('로컬에 answer 세팅')
        await newPc.setLocalDescription(answer);
        console.log('answer 보냄 ')
        socket.emit('answer', answer, remoteSocketId);
    } catch (err) {
        console.log(err)
    }
});

//먼저 들어와있던 사람(서호진)
socket.on('answer', async (answer, remoteSocketId) => {
    // myPeerConnection.setRemoteDescription(answer);
    console.log("컴퓨터 객체", pcObj)
    await pcObj[remoteSocketId].setRemoteDescription(answer)
});
//서로 정보(offer)교환 끝 그럼 이제 icecandidate server교환만 남음
socket.on('ice', async (ice, remoteSocketId) => {
    // console.log('candidate 받았어');
    await pcObj[remoteSocketId].addIceCandidate(ice)
    // myPeerConnection.addIceCandidate(ice, roomName);
});

socket.on('full', () => {
    alert('정원 초과입니다!');
    history.replace('/');
})


socket.on('leave_room', (leaveSocketId) => {
    deleteVideo(leaveSocketId);

})


//---------------------WEB RTC  코드
// 이 함수로 기존에 있던 사람과 들어온 사람의 stream을 연결해준다.
//즉 peer to peer 연결을 수행한다.


let collectiSoketId = []
function makeConnection(remoteSocketId) {
    //RTCPeerConnection == 암호화 및 대역폭 관리 오디오 또는 비디오 연결, peer 들 간의 데이터를
    // 안정적이고 효율적으로 통신하게 처리하는 webRTC 컴포넌트 
    console.log('makeConnection안에 있는 리모트 소켓 아이디', remoteSocketId)
    myPeerConnection = new RTCPeerConnection(
        {
            iceServers: [
                {
                    urls: "stun:stunserver.example.org"
                },
                {
                    urls: "turn:3.36.73.5",
                    username: "chattingqr",
                    credential: "chattingqr1234"
                }
            ]
        }
    );


    console.log("mypeerconnection", myPeerConnection)
    myPeerConnection.addEventListener('icecandidate', (event) => {
        // console.log("아이스 캔디에이트", event)
        handleIce(event, remoteSocketId)
    });


    // myPeerConnection.addEventListener('addstream', handleAddStream(data, remoteSocketId));

    //나의 stream이 상대 peer의 카메라 오디오를 가져옴 
    myPeerConnection.addEventListener('track', (data) => {
        console.log('트랙(addstream) ', data)
        handleAddStream(data, remoteSocketId)

    });



    // console.log(myStream.getTracks())
    //내 장치들을 offer에 넣어준다.
    myStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream));

    if (screenStream) {
        screenStream
            .getTracks()
            .forEach((track) => senders.push(myPeerConnection.addTrack(track, screenStream)));
    }


    console.log('내 스트림 ', myStream)
    console.log('스크린 스트림', screenStream)
    pcObj[remoteSocketId] = myPeerConnection;
    console.log("들어온 컴퓨터 객체들", pcObj)

    // senders.push(myStream);
    return myPeerConnection
}



function handleIce(data, remoteSocketId) {
    // console.log('candidate 보냄 ');
    // candidate===data
    socket.emit('ice', data.candidate, remoteSocketId);
    // console.log("아이스", data.candidate)
}

function handleAddStream(data, remoteSocketId) {
    const peerStream = data.streams[0]

    if (data.track.kind === 'video') {
        paintPeerFace(peerStream, remoteSocketId)
        if (screenStream) {
            screenShare.srcObject = screenStream;
        }
    }
}





async function shareScreen() {

    await getShareScreenMedia()
    console.log('sharescreen 에밋')
    socket2.emit('join_room', roomName);
}






async function paintPeerFace(peerStream, id) {
    try {

        const videoGrid = document.querySelector('#video-grid')
        const video = document.createElement('video')
        const div = document.createElement('div')
        div.id = id;
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = peerStream;
        div.appendChild(video);
        videoGrid.appendChild(div);
    } catch (err) {
        console.log(err)
    }
}


//나가면 해당 유저의 비디오 삭제
function deleteVideo(leavedSocketId) {
    const streams = document.querySelector('#video-grid');
    const streamArr = document.querySelectorAll('div')

    streamArr.forEach((element) => {
        if (element.id === leavedSocketId) {
            streams.removeChild(element);
        }
    })
}




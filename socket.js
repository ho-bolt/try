const app = require('./app');
const http = require('http');
const https = require('https');
// const credentials = require('./config/httpsConfig');

const max = 2;
//룸이 만들어지면 쌓이는 배열 
let roomObjArr = [];


let mediaStatus = {}
let server = '';
if (process.env.PORT) {
    server = https.createServer(app);
} else {
    server = http.createServer(app);
}

const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        credentials: true,
    },
});
console.log('소켓 서버도 실행!');

io.on('connection', (socket) => {
    let myRoom = null;

    //입력한 룸이름 받고 
    socket.on('join_room', (roomName) => {
        myRoom = roomName;
        let isRoomExits = false;
        let targetRoomObj = {};

        for (let i = 0; i < roomObjArr.length; i++) {

            //존재하는 룸 돌면서 입력한 룸이름이랑 맞다면
            //즉 입력한 룸이름이 이미 존재하는 룸이라면 
            //그 룸에 들어간다.
            if (roomObjArr[i].roomName === roomName) {

                //정해진 인원보다 많으면
                //full 이벤트로 못들어오게 막는다. 
                if (roomObjArr[i].currentNum >= max) {
                    console.log(`${roomName}방은 정원 초과!`)
                    socket.emit('full')
                    return
                }
                //정원초과가 아니라면 룸이 존재한다고 바뀌고 해당 i 번째 룸을
                // 타겟 룸 객체에 넣어준다.(활성화된 룸 )
                isRoomExits = true;
                targetRoomObj = roomObjArr[i]
                break
            }
        }

        //하지만 만약 입력한 룸이름이 없다면 새로운 방 생성 
        if (!isRoomExits) {
            targetRoomObj = {
                roomName,
                currentNum: 0,
                users: [],
            }
            roomObjArr.push(targetRoomObj)
        }
        console.log('현재 입력해서 들어간 룸', targetRoomObj)
        console.log('만들어진 방 배열', roomObjArr)

        //입력한 방에 들어온 유저의 소켓 아이디를 푸쉬함
        targetRoomObj.users.push({
            socketId: socket.id
        })
        targetRoomObj.currentNum++;

        //룸에 접속한다
        socket.join(roomName);

        //입력한 룸에 들어갈 때 유저와 소켓아이디 같이 보낸다. 
        //룸에 접속한 유저에게 emit 한다.

        socket.to(roomName).emit('welcome', targetRoomObj.users, socket.id);

    });



    socket.on('offer', (offer, remoteSocketId) => {

        socket.to(remoteSocketId).emit('offer', offer, socket.id);
    });

    socket.on('answer', (answer, remoteSocketId) => {
        socket.to(remoteSocketId).emit('answer', answer, socket.id);
    });

    socket.on('disconnecting', async () => {
        socket.to(myRoom).emit('leave_room', socket.id)

        for (let i = 0; i < roomObjArr.length; i++) {
            if (roomObjArr[i].roomName === myRoom) {
                const newUsers = roomObjArr[i].users.filter(
                    (user) => user.socketId !== socket.id
                )
                roomObjArr[i].users = newUsers
                roomObjArr[i].currentNum--;
                break;
            }
        }

    })

    socket.on('ice', (ice, remoteSocketId) => {
        socket.to(remoteSocketId).emit('ice', ice, socket.id);
    });

});

module.exports = { server };   
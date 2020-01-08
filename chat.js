var socket = io()

/* ���� �Ǿ��� �� ���� */
socket.on('connect', function () {
/* �̸��� �Է¹ް� */
    //var name = prompt('Please enter roomname', '')
    var url = location.href.split("#")[1];
    /* ������ ���ο� ������ �Դٰ� �˸� */
    socket.emit('newUser', url);
})

/* �����κ��� ������ ���� ��� */
socket.on('update', function (data) {
    var chat = document.getElementById('chat')

    var message = document.createElement('div')
    var node = document.createTextNode(`${data.name}: ${data.message}`)
    var className = ''

    // Ÿ�Կ� ���� ������ Ŭ������ �ٸ��� ����
    switch (data.type) {
        case 'message':
            className = 'other'
            break

        case 'connect':
            className = 'connect'
            break

        case 'disconnect':
            className = 'disconnect'
            break
    }

    message.classList.add(className)
    message.appendChild(node)
    chat.appendChild(message)
    chat.scrollTop = chat.scrollHeight;
})

/* �޽��� ���� �Լ� */
function send() {
    // �ԷµǾ��ִ� ������ ��������
    var message = document.getElementById('test').value

    // ���������� ������ ��ĭ���� ����
    document.getElementById('test').value = ''

    // ���� ������ �޽��� Ŭ���̾�Ʈ���� ǥ��
    var chat = document.getElementById('chat')
    var msg = document.createElement('div')
    var node = document.createTextNode(message)
    //msg.classList.add('me')
    //msg.appendChild(node)
    //chat.appendChild(msg)

    // ������ message �̺�Ʈ ���� + �����Ϳ� �Բ�
    socket.emit('message', { type: 'message', message: message })


    chat.scrollTop = chat.scrollHeight;
}
//====================================
// 필요한 라이브러리를 가져옵니다.
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.RENDER_EXTERNAL_URL; 

// 기존의 이벤트 '읽기' API
app.post('/get-calendar-events', async (req, res) => {
    // ... (이 부분은 이전 코드와 동일합니다) ...
});

// --- 새로 추가된 이벤트 '생성' API ---
app.post('/create-event', async (req, res) => {
    const { accessToken, title, date, description } = req.body;

    if (!accessToken || !title || !date) {
        return res.status(400).send('필수 정보(토큰, 제목, 날짜)가 누락되었습니다.');
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            REDIRECT_URI
        );
        oauth2Client.setCredentials({ access_token: accessToken });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 구글 캘린더 API에 맞는 이벤트 객체 형식으로 만듭니다.
        const event = {
            summary: title,
            description: description,
            start: {
                date: date, // 'YYYY-MM-DD' 형식
                timeZone: 'Asia/Seoul',
            },
            end: {
                date: date, // 종일 일정으로 설정
                timeZone: 'Asia/Seoul',
            },
        };

        // 'primary' 캘린더에 새 이벤트를 삽입(insert)합니다.
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });

        res.status(201).json(response.data);

    } catch (error) {
        console.error('이벤트 생성 중 에러 발생: ' + error);
        res.status(500).send('이벤트 생성에 실패했습니다.');
    }
});


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

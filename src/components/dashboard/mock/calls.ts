export interface Call {
    _id: string;
    agent: string;
    lead: string;
    phone_number: string;
    direction: "inbound" | "outbound";
    status: "active" | "completed" | "missed" | "failed";
    duration: number;
    recording_url: string;
    notes: string;
    tags: string[];
    quality_score: number;
    createdAt: string;
    updatedAt: string;

}
const calls: Call[] = [
    {
        _id: "67b701c95f0ba66da5b60709"
        ,
        agent: "65d7f5f8b8f3e4a5c6d1e123"
        ,
        lead: "65d7f6a9e8f3e4a5c6d1e456"
        ,
        phone_number: "+1234567890",
        direction: "outbound",
        status: "completed",
        duration: 310,
        recording_url: "https://res.cloudinary.com/dyqg8x26j/video/upload/v1715775695/call_records/a31njngbqtqgskxtwxpc.wav",
        notes: "",
        tags: [
            "follow-up",
            "interested"
        ],
        quality_score: 0,
        createdAt: "2025-02-20T10:19:53.830Z"
        ,
        updatedAt: "2025-02-20T10:19:53.830Z"
    }
    ,
    {
        _id: "67b701c95f0ba66da5b6070a"
        ,
        agent: "65d7f5f8b8f3e4a5c6d1e124"
        ,
        lead: "65d7f6a9e8f3e4a5c6d1e457"
        ,
        phone_number: "+1987654321",
        direction: "outbound",
        status: "missed",
        duration: 23,
        recording_url: "https://res.cloudinary.com/dyqg8x26j/video/upload/v1733848929/call_records/vucaq7dz6foq4vbhqkw8.wav",
        notes: "No answer, left a voicemail.",
        tags: [
            "voicemail"
        ],
        quality_score: 0,
        createdAt: "2025-02-20T10:19:53.830Z"
        ,
        updatedAt: "2025-02-20T10:19:53.830Z"
    }
    ,
    {
        _id: "67b701c95f0ba66da5b6070b"
        ,
        agent: "65d7f5f8b8f3e4a5c6d1e125"
        ,
        lead: "65d7f6a9e8f3e4a5c6d1e458"
        ,
        phone_number: "+1122334455",
        direction: "outbound",
        status: "completed",
        duration: 68,
        recording_url: "https://res.cloudinary.com/dyqg8x26j/video/upload/v1734700163/call_records/s65mvimwtfdibmz7mfhh.wav",
        notes: "Discussed pricing options.",
        tags: [
            "Devis request"
        ],
        quality_score: 0,
        createdAt: "2025-02-20T10:19:53.830Z"
        ,
        updatedAt: "2025-02-20T10:19:53.830Z"
    }
    ,
    {
        _id: "67b701c95f0ba66da5b6070c"
        ,
        agent: "65d7f5f8b8f3e4a5c6d1e126"
        ,
        lead: "65d7f6a9e8f3e4a5c6d1e459"
        ,
        phone_number: "+1555666777",
        direction: "outbound",
        status: "completed",
        duration: 194,
        recording_url: "https://res.cloudinary.com/dyqg8x26j/video/upload/v1736681863/call_records/sjszmeddfypkpsrwlth2.wav",
        notes: "No answer, left a voicemail.",
        tags: [
            "voicemail"
        ],
        quality_score: 0,
        createdAt: "2025-02-20T10:19:53.830Z"
        ,
        updatedAt: "2025-02-20T10:19:53.830Z"
    }

];

export const getMockCalls = (): Call[] => {
    return calls;
};

import React, { useState, useEffect } from 'react';
import { TelnyxRTC, ICall } from '@telnyx/webrtc';
import {
  Box, Button, TextField, Typography, Paper, Alert, CircularProgress,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
  Phone as PhoneIcon,
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon
} from '@mui/icons-material';
import { callsApi } from '../services/api/calls';
//use credentials instead of env variables
interface AudioDevice {
  deviceId: string;
  label: string;
  kind: string;
}

const TelnyxCallTest: React.FC = () => {
  const [client, setClient] = useState<TelnyxRTC | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callStatus, setCallStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentCall, setCurrentCall] = useState<ICall | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const [audioDevices, setAudioDevices] = useState<{
    inputs: AudioDevice[];
    outputs: AudioDevice[];
  }>({ inputs: [], outputs: [] });

  const [selectedDevices, setSelectedDevices] = useState({
    input: '',
    output: ''
  });

  useEffect(() => {
    initializeTelnyxClient();
    getAudioDevices();

    return () => {
      client?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAudioDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true }); // Request permission
      const devices = await navigator.mediaDevices.enumerateDevices();

      const inputs = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');

      setAudioDevices({
        inputs: inputs.map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId}`, kind: d.kind })),
        outputs: outputs.map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId}`, kind: d.kind }))
      });

      if (inputs.length) setSelectedDevices(prev => ({ ...prev, input: inputs[0].deviceId }));
      if (outputs.length) setSelectedDevices(prev => ({ ...prev, output: outputs[0].deviceId }));
    } catch (err) {
      console.error('Device access error:', err);
      setError('Unable to access audio devices. Please allow microphone permissions.');
    }
  };

  const initializeTelnyxClient = async () => {
    try {
      console.log('VITE_TELNYX_USERNAME:', import.meta.env.VITE_TELNYX_USERNAME);
      console.log('VITE_TELNYX_PASSWORD:', import.meta.env.VITE_TELNYX_PASSWORD);
      
      const telnyxClient = new TelnyxRTC({
        login: import.meta.env.VITE_TELNYX_USERNAME,
        password: import.meta.env.VITE_TELNYX_PASSWORD,
      });
      console.log('telnyxClient', telnyxClient);
      telnyxClient.on('telnyx.ready', () => {
        console.log('Telnyx ready');
        setCallStatus('Client ready');
      });
     

      telnyxClient.on('telnyx.error', (error: any) => {
        console.error('Telnyx error:', error);
        setError(`Telnyx error: ${error.message || error}`);
      });

      telnyxClient.on('call:connected', () => {
        console.log('Call connected');
        setCallStatus('Call connected');
      });

      telnyxClient.on('call:disconnected', () => {
        console.log('Call disconnected');
        setCallStatus('Call ended');
        setCurrentCall(null);
      });
      
      telnyxClient.connect();
     
      setClient(telnyxClient);
    } catch (err: any) {
      console.error('Client init error:', err);
      setError(`Initialization failed: ${err.message}`);
    }
  };

  const handleCall = async () => {
    if (!client || !phoneNumber) return;
    setLoading(true);
    setError('');

    try {
      const call = await client.newCall({
        destinationNumber: phoneNumber,
        callerNumber: import.meta.env.VITE_TELNYX_CALLER_ID || '',
        audio: true,
        video: false
      });

      if (selectedDevices.input) await call.setAudioInDevice(selectedDevices.input);
      if (selectedDevices.output) await call.setAudioOutDevice(selectedDevices.output);

      setCurrentCall(call);
      setCallStatus('Dialing...');
    } catch (err: any) {
      console.error('Call error:', err);
      setError(`Call error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleHangup = async () => {
    if (!currentCall) return;
  
    try {
      await (currentCall as any).hangup(); // ✅ méthode correcte pour mettre fin à l'appel
      setCurrentCall(null);
      setCallStatus('Call ended');
    } catch (err: any) {
      console.error('Hangup error:', err);
      setError(`Hangup error: ${err.message}`);
    }
  };
  

  const handleToggleMute = () => {
    if (!currentCall) return;
  
    try {
      if (isMuted) {
        (currentCall as any).audio.unmuteAudio();
      } else {
        (currentCall as any).audio.muteAudio();
      }
      setIsMuted(!isMuted);
    } catch (err: any) {
      setError(`Mute error: ${err.message}`);
    }
  };
  

  return (
    <Box className="max-w-2xl mx-auto mt-8">
      <Paper elevation={3} className="p-6">
        <Typography variant="h4" gutterBottom textAlign="center">
          Telnyx WebRTC Call Test
        </Typography>

        <FormControl fullWidth className="mb-4">
          <InputLabel>Microphone</InputLabel>
          <Select
            value={selectedDevices.input}
            onChange={(e) => setSelectedDevices(prev => ({ ...prev, input: e.target.value }))}
            label="Microphone"
          >
            {audioDevices.inputs.map(device => (
              <MenuItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth className="mb-4">
          <InputLabel>Speaker</InputLabel>
          <Select
            value={selectedDevices.output}
            onChange={(e) => setSelectedDevices(prev => ({ ...prev, output: e.target.value }))}
            label="Speaker"
          >
            {audioDevices.outputs.map(device => (
              <MenuItem key={device.deviceId} value={device.deviceId}>
                {device.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Phone Number"
          variant="outlined"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+33612345678"
          className="mb-4"
        />

        {error && <Alert severity="error" className="mb-4">{error}</Alert>}
        {callStatus && <Alert severity="info" className="mb-4">{callStatus}</Alert>}

        <Box className="flex justify-center gap-4">
          <Button
            variant="contained"
            color="primary"
            startIcon={<PhoneIcon />}
            onClick={handleCall}
            disabled={loading || !phoneNumber || !!currentCall}
          >
            {loading ? <CircularProgress size={24} /> : 'Call'}
          </Button>

          <Button
            variant="contained"
            color="error"
            startIcon={<CallEndIcon />}
            onClick={handleHangup}
            disabled={!currentCall}
          >
            Hang Up
          </Button>

          <Button
            variant="contained"
            color={isMuted ? 'warning' : 'success'}
            startIcon={isMuted ? <MicOffIcon /> : <MicIcon />}
            onClick={handleToggleMute}
            disabled={!currentCall}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default TelnyxCallTest;

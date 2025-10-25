type Broadcasters = {
  broadcastTurn: (meetingId: string, turn: unknown) => void;
  broadcastWhiteboard: (meetingId: string, whiteboard: unknown) => void;
  broadcastStatus: (meetingId: string, status: string) => void;
};

const noop = () => {};
const state: Broadcasters = {
  broadcastTurn: noop,
  broadcastWhiteboard: noop,
  broadcastStatus: noop
};

export function setBroadcasters(b: Broadcasters) {
  state.broadcastTurn = b.broadcastTurn;
  state.broadcastWhiteboard = b.broadcastWhiteboard;
  state.broadcastStatus = b.broadcastStatus;
}

export function broadcastTurn(meetingId: string, turn: unknown) {
  state.broadcastTurn(meetingId, turn);
}

export function broadcastWhiteboard(meetingId: string, whiteboard: unknown) {
  state.broadcastWhiteboard(meetingId, whiteboard);
}

export function broadcastStatus(meetingId: string, status: string) {
  state.broadcastStatus(meetingId, status);
}

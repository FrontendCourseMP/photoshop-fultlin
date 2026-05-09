import { ChannelPanel } from './ChannelPanel';

interface SidebarProps {
  originalData: ImageData | null;
  channels: number;
  channelStates: boolean[];
  onToggleChannel: (index: number) => void;
}

export function Sidebar({ originalData, channels, channelStates, onToggleChannel }: SidebarProps) {
  return (
    <aside className="sidebar">
      <ChannelPanel
        originalData={originalData}
        channels={channels}
        channelStates={channelStates}
        onToggleChannel={onToggleChannel}
      />
    </aside>
  );
}

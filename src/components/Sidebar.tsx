import { useState } from 'react';
import { ChannelPanel } from './ChannelPanel';

interface SidebarProps {
  getSourceImageData: () => ImageData | null;
  channels: number;
  channelStates: boolean[];
  onToggleChannel: (index: number) => void;
}

export function Sidebar({ getSourceImageData, channels, channelStates, onToggleChannel }: SidebarProps) {
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);

  return (
    <aside className="sidebar">
      <div className="panel-container">
        <div className="panel-tabs">
          <span className="panel-tab active">Каналы</span>
        </div>

        <div
          className={`panel-header${channelsCollapsed ? '' : ''}`}
          onClick={() => setChannelsCollapsed(!channelsCollapsed)}
        >
          <span className={`panel-arrow ${channelsCollapsed ? '' : 'expanded'}`}>
            &#9654;
          </span>
          <span className="panel-title">Каналы</span>
        </div>

        {!channelsCollapsed && (
          <ChannelPanel
            getSourceImageData={getSourceImageData}
            channels={channels}
            channelStates={channelStates}
            onToggleChannel={onToggleChannel}
          />
        )}
      </div>
    </aside>
  );
}

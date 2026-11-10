import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {ToolReel, toolReelFrames} from './ToolReel';

const FPS = 30;
const Root = () => (
  <Composition
    id="ToolReel"
    component={ToolReel}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 15}
    defaultProps={{tool: {name: 'Tool'}, hook: 'pass a\n*tool-reel.json*', media: {type: 'screens', screens: []}, beats: [], cta: {keyword: 'LINK'}}}
    calculateMetadata={({props}) => ({durationInFrames: toolReelFrames(props, FPS)})}
  />
);
registerRoot(Root);

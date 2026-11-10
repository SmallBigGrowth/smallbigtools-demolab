import React from 'react';
import {Composition} from 'remotion';
import {ToolReel, toolReelFrames, ToolCarousel, carouselSlides} from './ToolReel';

const FPS = 30;
const DEFAULTS = {tool: {name: 'Tool'}, hook: 'pass a\n*tool-reel.json*', media: {type: 'screens', screens: []}, beats: [], cta: {keyword: 'LINK'}};
export const Root = () => (
  <>
    <Composition id="ToolReel" component={ToolReel} width={1080} height={1920} fps={FPS} durationInFrames={FPS * 15}
      defaultProps={DEFAULTS} calculateMetadata={({props}) => ({durationInFrames: toolReelFrames(props, FPS)})} />
    <Composition id="ToolCarousel" component={ToolCarousel} width={1080} height={1350} fps={FPS} durationInFrames={6}
      defaultProps={DEFAULTS} calculateMetadata={({props}) => ({durationInFrames: carouselSlides(props)})} />
  </>
);

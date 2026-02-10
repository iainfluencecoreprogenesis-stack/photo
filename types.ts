
export interface LandmarkInfo {
  name: string;
  shortDescription: string;
  coordinates?: { x: number; y: number };
  pointsOfInterest: PointOfInterest[];
}

export interface PointOfInterest {
  label: string;
  description: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface DetailedHistory {
  fullStory: string;
  sources: { title: string; uri: string }[];
}

export interface TourState {
  image: string | null;
  landmark: LandmarkInfo | null;
  history: DetailedHistory | null;
  audioBuffer: AudioBuffer | null;
  loadingStage: 'idle' | 'identifying' | 'researching' | 'narrating' | 'ready';
  error: string | null;
}

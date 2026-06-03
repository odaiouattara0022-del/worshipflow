export type OutputType = "propresenter" | "freeshow" | "openlp";

export interface Capabilities {
  sendSong: boolean;
  sendService: boolean;
  liveControl: boolean;
  status: boolean;
  syncLibrary: boolean;
  themes: boolean;
}

export interface OutputStatus {
  currentSlide?: string;
  nextSlide?: string;
  presentationName?: string;
}

export interface LibraryItem {
  id: string;
  name: string;
}

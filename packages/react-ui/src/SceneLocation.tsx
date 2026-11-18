import { PinIcon } from './voyage/PinIcon.tsx';

/** Where the scene is and what it shows, as the expeditions label it (Océano design, #297): a pin and two lines over the scene. */
export function SceneLocation({ place, detail }: { place: string; detail: string }) {
  return <div className="scene-location"><PinIcon /><span>{place}<small>{detail}</small></span></div>;
}

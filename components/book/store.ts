/** Mutable state shared between the page (scroll, pointer) and the 3D scene. Read every frame. */
export type BookStore = {
  /** Where the scroll position says the book should be, in steps. */
  target: number;
  /** Where the book currently is. Eases toward target. */
  p: number;
  /** 1 while the camera is flying into a page on the way to a post. */
  zoom: number;
  zoomT: number;
  /** Pointer position from -1 to 1, for a hint of parallax. */
  px: number;
  py: number;
};

export function createBookStore(): BookStore {
  return { target: 0, p: 0, zoom: 0, zoomT: 0, px: 0, py: 0 };
}

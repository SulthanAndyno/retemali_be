declare module "slug" {
  function slug(string: string, options?: { lower?: boolean } | string): string;
  export default slug;
}

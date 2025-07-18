import * as sass from 'sass';
import nunjucks from "nunjucks";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("**/*.css");
  eleventyConfig.addPassthroughCopy("**/*.svg");
  eleventyConfig.addPassthroughCopy("quickMap/components/**/*.html");
  eleventyConfig.addPassthroughCopy("quickMap/config");
  eleventyConfig.addPassthroughCopy("quickMap/assets");
  eleventyConfig.addPassthroughCopy("quickMap/data/");

  eleventyConfig.addPassthroughCopy({
    "node_modules/govuk-frontend/dist/govuk/assets": "assets",
    "node_modules/govuk-frontend/dist/govuk": "/node_modules/govuk-frontend/dist/govuk",
    //"node_modules/gdal3.js/dist/package": "assets/js/gdal3.js",
    //  "node_modules/d3/dist/": "assets/js/d3",    
  });

  eleventyConfig.addTemplateFormats("scss");
  eleventyConfig.addExtension("scss", {
    outputFileExtension: "css",
    compile: function(inputContent) {
      return (_) => {
        let result = sass.compileString(inputContent, {
          loadPaths: [
            "./quickMap/assets/css",
            "./quickMap",
            "."
          ]
        });
        return result.css;
      };
    }
  });
  eleventyConfig.setLibrary("njk", nunjucks.configure({
    autoescape: false
  }));

  eleventyConfig.addTransform("fixPaths", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      if (process.env.NODE_ENV === "production") {
        return content
          .replace(/href="\/support"(?!\/)/g, 'href="/sds-quick-map/support/"')
          .replace(/href="\/terms-conditions"(?!\/)/g, 'href="/sds-quick-map/terms-conditions/"')
          .replace(/href="\/"(?![a-z])/g, 'href="/sds-quick-map/"')
          .replace(/src="config\/site-config\.js"/g, 'src="/sds-quick-map/config/site-config.js"')
          .replace(/href="assets\/css\/main\.css"/g, 'href="/sds-quick-map/assets/css/main.css"');
      }
    }
    return content;
  });
  
  return {
    dataTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    dir: {
      input: "quickMap",
      output: "dist",
      includes: "_includes",

    },
  }
};

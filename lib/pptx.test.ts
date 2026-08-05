import { describe, expect, it } from "vitest";
import { buildZip } from "./zip.test";
import { isPptxFile, parsePptxToSlides } from "./pptx";

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"';

const presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation ${NS}><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>`;

const presentationRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`;

const slide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld ${NS}><p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title 1"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr/>
  <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" b="1"/><a:t>Hello World</a:t></a:r></a:p></p:txBody>
</p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="Content 2"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/>
  <p:txBody><a:bodyPr/><a:lstStyle/>
    <a:p><a:pPr lvl="0"/><a:r><a:rPr lang="en-US"/><a:t>First point</a:t></a:r></a:p>
    <a:p><a:pPr lvl="1"/><a:r><a:rPr lang="en-US" i="1"/><a:t>Nested italic point</a:t></a:r></a:p>
    <a:p><a:pPr lvl="0"/><a:r><a:rPr lang="en-US"/><a:t>Use *bold* stars</a:t></a:r></a:p>
    <a:p><a:pPr lvl="0"/><a:r><a:rPr lang="en-US"><a:hlinkClick r:id="rId2"/></a:rPr><a:t>Link point</a:t></a:r></a:p>
  </p:txBody>
</p:sp>
<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="4" name="Table 3"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>
  <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblGrid><a:gridCol w="0"/><a:gridCol w="0"/></a:tblGrid>
    <a:tr h="0"><a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>H1</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>H2</a:t></a:r></a:p></a:txBody></a:tc></a:tr>
    <a:tr h="0"><a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>A</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>B</a:t></a:r></a:p></a:txBody></a:tc></a:tr>
  </a:tbl></a:graphicData></a:graphic>
</p:graphicFrame>
</p:spTree></p:cSld></p:sld>`;

const slide1Rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>
</Relationships>`;

const notesSlide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes ${NS}><p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr/><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/>
  <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US"/><a:t>Speaker notes here</a:t></a:r></a:p></p:txBody>
</p:sp>
</p:spTree></p:cSld></p:notes>`;

function buildSamplePptx(): Buffer {
  return buildZip([
    { name: "ppt/presentation.xml", data: Buffer.from(presentationXml), method: 8 },
    { name: "ppt/_rels/presentation.xml.rels", data: Buffer.from(presentationRels), method: 0 },
    { name: "ppt/slides/slide1.xml", data: Buffer.from(slide1Xml), method: 8 },
    { name: "ppt/slides/_rels/slide1.xml.rels", data: Buffer.from(slide1Rels), method: 0 },
    { name: "ppt/notesSlides/notesSlide1.xml", data: Buffer.from(notesSlide1Xml), method: 8 },
  ]);
}

describe("isPptxFile", () => {
  it("recognises the ZIP magic bytes", () => expect(isPptxFile(buildSamplePptx())).toBe(true));
  it("rejects non-ZIP buffers", () => expect(isPptxFile(Buffer.from("hello"))).toBe(false));
});

describe("parsePptxToSlides", () => {
  it("extracts title, nested bullets, formatting, links, tables and notes into Markdown", async () => {
    const slides = await parsePptxToSlides(buildSamplePptx());
    expect(slides).toHaveLength(1);
    expect(slides[0].markdown).toBe(
      "# **Hello World**\n\n" +
      "- First point\n" +
      "  - *Nested italic point*\n" +
      "- Use \\*bold\\* stars\n" +
      "- [Link point](https://example.com)\n\n" +
      "| H1 | H2 |\n| --- | --- |\n| A | B |"
    );
    expect(slides[0].notes).toBe("Speaker notes here");
  });

  it("rejects files that are not valid PowerPoint packages", async () => {
    await expect(parsePptxToSlides(Buffer.from("not a pptx"))).rejects.toThrow();
  });

  it("converts OMML equations (a14:m) into LaTeX math", async () => {
    const slideWithMath = slide1Xml.replace(
      "</p:spTree>",
      `<p:sp><p:nvSpPr><p:cNvPr id="9" name="Equation 1"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="2"/></p:nvPr></p:nvSpPr><p:spPr/>
  <p:txBody><a:bodyPr/><a:lstStyle/>
    <a:p>
      <a:r><a:rPr lang="en-US"/><a:t>Roots are </a:t></a:r>
      <a14:m><m:oMath><m:f><m:num><m:r><m:t>-b</m:t></m:r><m:r><m:t>±</m:t></m:r><m:sSup><m:e><m:r><m:t>√</m:t></m:r><m:r><m:t>b</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:num><m:den><m:r><m:t>2</m:t></m:r><m:r><m:t>a</m:t></m:r></m:den></m:f></m:oMath></a14:m>
    </a:p>
  </p:txBody>
</p:sp>
</p:spTree>`
    );
    const buf = buildZip([
      { name: "ppt/presentation.xml", data: Buffer.from(presentationXml), method: 8 },
      { name: "ppt/_rels/presentation.xml.rels", data: Buffer.from(presentationRels), method: 0 },
      { name: "ppt/slides/slide1.xml", data: Buffer.from(slideWithMath), method: 8 },
    ]);
    const slides = await parsePptxToSlides(buf);
    expect(slides[0].markdown).toContain("Roots are $\\frac{-b±{√b}^{2}}{2a}$");
  });

  it("converts equations wrapped in mc:AlternateContent (real PowerPoint structure)", async () => {
    // PowerPoint 2013+ 會把公式寫成 <mc:AlternateContent><mc:Choice Requires="a14"><a14:m>…</a14:m></mc:Choice>…
    const slideWithWrappedMath = slide1Xml.replace(
      "</p:spTree>",
      `<p:sp><p:nvSpPr><p:cNvPr id="9" name="Equation 1"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="2"/></p:nvPr></p:nvSpPr><p:spPr/>
  <p:txBody><a:bodyPr/><a:lstStyle/>
    <a:p>
      <a:r><a:rPr lang="en-US"/><a:t>Area is </a:t></a:r>
      <mc:AlternateContent>
        <mc:Choice Requires="a14">
          <a14:m><m:oMath><m:f><m:num><m:r><m:t>π</m:t></m:r><m:r><m:t>r</m:t></m:r><m:sSup><m:e><m:r><m:t>r</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:num><m:den><m:r><m:t>2</m:t></m:r></m:den></m:f></m:oMath></a14:m>
        </mc:Choice>
        <mc:Fallback><a:r><a:rPr lang="en-US"/><a:t>pi*r^2/2</a:t></a:r></mc:Fallback>
      </mc:AlternateContent>
      <a:r><a:rPr lang="en-US"/><a:t>.</a:t></a:r>
    </a:p>
  </p:txBody>
</p:sp>
</p:spTree>`
    );
    const buf = buildZip([
      { name: "ppt/presentation.xml", data: Buffer.from(presentationXml), method: 8 },
      { name: "ppt/_rels/presentation.xml.rels", data: Buffer.from(presentationRels), method: 0 },
      { name: "ppt/slides/slide1.xml", data: Buffer.from(slideWithWrappedMath), method: 8 },
    ]);
    const slides = await parsePptxToSlides(buf);
    expect(slides[0].markdown).toContain("Area is $\\frac{πr{r}^{2}}{2}$.");
    expect(slides[0].markdown).not.toContain("pi*r^2/2");
  });

  it("falls back to plain text when mc:AlternateContent has no OMML", async () => {
    const slideWithFallback = slide1Xml.replace(
      "</p:spTree>",
      `<p:sp><p:nvSpPr><p:cNvPr id="9" name="Equation 1"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="2"/></p:nvPr></p:nvSpPr><p:spPr/>
  <p:txBody><a:bodyPr/><a:lstStyle/>
    <a:p>
      <mc:AlternateContent>
        <mc:Choice Requires="a14"><a14:m/></mc:Choice>
        <mc:Fallback><a:r><a:rPr lang="en-US"/><a:t>legacy formula text</a:t></a:r></mc:Fallback>
      </mc:AlternateContent>
    </a:p>
  </p:txBody>
</p:sp>
</p:spTree>`
    );
    const buf = buildZip([
      { name: "ppt/presentation.xml", data: Buffer.from(presentationXml), method: 8 },
      { name: "ppt/_rels/presentation.xml.rels", data: Buffer.from(presentationRels), method: 0 },
      { name: "ppt/slides/slide1.xml", data: Buffer.from(slideWithFallback), method: 8 },
    ]);
    const slides = await parsePptxToSlides(buf);
    expect(slides[0].markdown).toContain("legacy formula text");
  });

  it("converts m:oMathPara paragraphs (display equations)", async () => {
    const slideWithDisplayMath = slide1Xml.replace(
      "</p:spTree>",
      `<p:sp><p:nvSpPr><p:cNvPr id="9" name="Equation 1"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="2"/></p:nvPr></p:nvSpPr><p:spPr/>
  <p:txBody><a:bodyPr/><a:lstStyle/>
    <a:p>
      <m:oMathPara><m:oMath><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>n</m:t></m:r></m:sup></m:sSup><m:r><m:t>+</m:t></m:r><m:sSub><m:e><m:r><m:t>y</m:t></m:r></m:e><m:sub><m:r><m:t>n</m:t></m:r></m:sub></m:sSub></m:oMath></m:oMathPara>
    </a:p>
  </p:txBody>
</p:sp>
</p:spTree>`
    );
    const buf = buildZip([
      { name: "ppt/presentation.xml", data: Buffer.from(presentationXml), method: 8 },
      { name: "ppt/_rels/presentation.xml.rels", data: Buffer.from(presentationRels), method: 0 },
      { name: "ppt/slides/slide1.xml", data: Buffer.from(slideWithDisplayMath), method: 8 },
    ]);
    const slides = await parsePptxToSlides(buf);
    expect(slides[0].markdown).toContain("${x}^{n}+{y}_{n}$");
  });
});

use std::{collections::BTreeMap, fmt};

#[derive(Debug, Clone)]
pub enum VNode {
    Element(Element),
    Text(String),
    Fragment(Vec<VNode>),
    UnsafeRaw(String),
}

#[derive(Debug, Clone)]
pub struct Element {
    pub tag: String,
    pub attrs: BTreeMap<String, AttrValue>,
    pub children: Vec<VNode>,
}

#[derive(Debug, Clone)]
pub enum AttrValue {
    Text(String),
    Bool(bool),
    Omit,
}

#[derive(Debug, Clone, Default)]
pub struct Props {
    pub attrs: BTreeMap<String, AttrValue>,
}

pub type Children = Vec<VNode>;
pub type ComponentResult = VNode;

#[derive(Debug, Clone)]
pub enum Part {
    Host(Props),
    Node(VNode),
}

// ---------- conversions ----------

pub trait IntoNode {
    fn into_node(self) -> VNode;
}

impl IntoNode for VNode {
    fn into_node(self) -> VNode {
        self
    }
}

impl IntoNode for Element {
    fn into_node(self) -> VNode {
        VNode::Element(self)
    }
}

impl IntoNode for Part {
    fn into_node(self) -> VNode {
        match self {
            Part::Host(_) => VNode::Fragment(vec![]),
            Part::Node(node) => node,
        }
    }
}

impl IntoNode for &str {
    fn into_node(self) -> VNode {
        VNode::Text(self.to_string())
    }
}

impl IntoNode for String {
    fn into_node(self) -> VNode {
        VNode::Text(self)
    }
}

impl IntoNode for bool {
    fn into_node(self) -> VNode {
        VNode::Text(self.to_string())
    }
}

macro_rules! impl_number_node {
    ($($t:ty),* $(,)?) => {
        $(
            impl IntoNode for $t {
                fn into_node(self) -> VNode {
                    VNode::Text(self.to_string())
                }
            }
        )*
    };
}

impl_number_node!(usize, isize, u8, u16, u32, u64, i8, i16, i32, i64, f32, f64);

impl<T: IntoNode> IntoNode for Option<T> {
    fn into_node(self) -> VNode {
        match self {
            Some(v) => v.into_node(),
            None => VNode::Fragment(vec![]),
        }
    }
}

impl IntoNode for Vec<VNode> {
    fn into_node(self) -> VNode {
        VNode::Fragment(self)
    }
}

impl<const N: usize> IntoNode for [VNode; N] {
    fn into_node(self) -> VNode {
        VNode::Fragment(self.into())
    }
}

pub trait IntoChildren {
    fn into_children(self) -> Children;
}

impl IntoChildren for Vec<VNode> {
    fn into_children(self) -> Children {
        self
    }
}

impl<const N: usize> IntoChildren for [VNode; N] {
    fn into_children(self) -> Children {
        self.into()
    }
}

impl IntoChildren for () {
    fn into_children(self) -> Children {
        vec![]
    }
}

pub trait IntoAttrValue {
    fn into_attr_value(self) -> AttrValue;
}

impl IntoAttrValue for AttrValue {
    fn into_attr_value(self) -> AttrValue {
        self
    }
}

impl IntoAttrValue for &str {
    fn into_attr_value(self) -> AttrValue {
        AttrValue::Text(self.to_string())
    }
}

impl IntoAttrValue for String {
    fn into_attr_value(self) -> AttrValue {
        AttrValue::Text(self)
    }
}

impl IntoAttrValue for bool {
    fn into_attr_value(self) -> AttrValue {
        AttrValue::Bool(self)
    }
}

macro_rules! impl_number_attr {
    ($($t:ty),* $(,)?) => {
        $(
            impl IntoAttrValue for $t {
                fn into_attr_value(self) -> AttrValue {
                    AttrValue::Text(self.to_string())
                }
            }
        )*
    };
}

impl_number_attr!(usize, isize, u8, u16, u32, u64, i8, i16, i32, i64, f32, f64);

impl<T: ToString> IntoAttrValue for Option<T> {
    fn into_attr_value(self) -> AttrValue {
        match self {
            Some(v) => AttrValue::Text(v.to_string()),
            None => AttrValue::Omit,
        }
    }
}

impl From<VNode> for Part {
    fn from(node: VNode) -> Self {
        Part::Node(node)
    }
}

impl From<Element> for Part {
    fn from(el: Element) -> Self {
        Part::Node(VNode::Element(el))
    }
}

impl From<Props> for Part {
    fn from(props: Props) -> Self {
        Part::Host(props)
    }
}

// ---------- component result ----------

pub trait IntoComponentResult {
    fn into_component_result(self, name: &str) -> VNode;
}

impl IntoComponentResult for VNode {
    fn into_component_result(self, _name: &str) -> VNode {
        self
    }
}

impl IntoComponentResult for Element {
    fn into_component_result(self, _name: &str) -> VNode {
        VNode::Element(self)
    }
}

impl IntoComponentResult for Part {
    fn into_component_result(self, _name: &str) -> VNode {
        self.into_node()
    }
}

impl<const N: usize> IntoComponentResult for [Part; N] {
    fn into_component_result(self, name: &str) -> VNode {
        let mut host_props = Props::new();
        let mut body = Vec::<VNode>::new();

        for part in self {
            match part {
                Part::Host(props) => host_props = props,
                Part::Node(node) => body.push(node),
            }
        }

        let tag = format!("ui-{}", name.to_ascii_lowercase().replace("_", "-"));
        let mut el = VNode::element(tag);

        for (k, v) in host_props.attrs {
            el.push_attr(k, v);
        }

        for node in body {
            el.push_child(node);
        }

        VNode::Element(el)
    }
}

impl IntoComponentResult for Vec<VNode> {
    fn into_component_result(self, _name: &str) -> VNode {
        VNode::Fragment(self)
    }
}

// ---------- core ----------

impl VNode {
    pub fn text(value: impl ToString) -> Self {
        VNode::Text(value.to_string())
    }

    pub fn fragment(nodes: impl IntoIterator<Item = VNode>) -> Self {
        VNode::Fragment(nodes.into_iter().collect())
    }

    pub fn unsafe_raw(value: impl Into<String>) -> Self {
        VNode::UnsafeRaw(value.into())
    }

    pub fn element(tag: impl Into<String>) -> Element {
        Element {
            tag: tag.into(),
            attrs: BTreeMap::new(),
            children: vec![],
        }
    }
}

impl Element {
    pub fn attr(mut self, key: impl Into<String>, value: impl IntoAttrValue) -> Self {
        self.attrs.insert(key.into(), value.into_attr_value());
        self
    }

    pub fn push_attr(&mut self, key: impl Into<String>, value: impl IntoAttrValue) {
        self.attrs.insert(key.into(), value.into_attr_value());
    }

    pub fn push_child(&mut self, child: impl IntoNode) {
        match child.into_node() {
            VNode::Fragment(nodes) => self.children.extend(nodes),
            node => self.children.push(node),
        }
    }
}

impl Props {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn attr(mut self, key: impl Into<String>, value: impl IntoAttrValue) -> Self {
        self.attrs.insert(key.into(), value.into_attr_value());
        self
    }

    pub fn bool(&self, key: &str) -> Option<bool> {
        match self.attrs.get(key) {
            Some(AttrValue::Bool(v)) => Some(*v),
            Some(AttrValue::Text(v)) => match v.as_str() {
                "true" => Some(true),
                "false" => Some(false),
                _ => None,
            },
            _ => None,
        }
    }

    pub fn str(&self, key: &str) -> Option<&str> {
        match self.attrs.get(key) {
            Some(AttrValue::Text(v)) => Some(v),
            _ => None,
        }
    }
}

impl IntoChildren for Vec<Part> {
    fn into_children(self) -> Children {
        self.into_iter().map(IntoNode::into_node).collect()
    }
}

impl<const N: usize> IntoChildren for [Part; N] {
    fn into_children(self) -> Children {
        self.into_iter().map(IntoNode::into_node).collect()
    }
}

// ---------- render ----------

pub fn escape_html(s: &str) -> String {
    let mut out = String::with_capacity(s.len());

    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(c),
        }
    }

    out
}

fn safe_tag(tag: &str) -> bool {
    !tag.is_empty()
        && tag
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | ':' | '_'))
}

fn safe_attr(key: &str) -> bool {
    let lower = key.to_ascii_lowercase();

    if lower.starts_with("on") {
        return false;
    }

    if matches!(lower.as_str(), "state" | "on" | "emit" | "srcdoc") {
        return false;
    }

    key.chars()
        .next()
        .is_some_and(|c| c.is_ascii_alphabetic() || matches!(c, '_' | ':' | '-'))
        && key
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | ':' | '.' | '-'))
}

fn dangerous_url_attr(key: &str, value: &str) -> bool {
    matches!(
        key.to_ascii_lowercase().as_str(),
        "href" | "src" | "xlink:href" | "formaction" | "action" | "poster" | "data"
    ) && value.trim_start().to_ascii_lowercase().starts_with("javascript:")
}

fn void_element(tag: &str) -> bool {
    matches!(
        tag,
        "area"
            | "base"
            | "br"
            | "col"
            | "embed"
            | "hr"
            | "img"
            | "input"
            | "link"
            | "meta"
            | "param"
            | "source"
            | "track"
            | "wbr"
    )
}

impl fmt::Display for VNode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            VNode::Text(text) => write!(f, "{}", escape_html(text)),
            VNode::UnsafeRaw(raw) => write!(f, "{raw}"),
            VNode::Fragment(nodes) => {
                for node in nodes {
                    write!(f, "{node}")?;
                }

                Ok(())
            }
            VNode::Element(el) => write!(f, "{el}"),
        }
    }
}

impl fmt::Display for Element {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if !safe_tag(&self.tag) {
            return Ok(());
        }

        write!(f, "<{}", self.tag)?;

        for (key, value) in &self.attrs {
            if !safe_attr(key) {
                continue;
            }

            match value {
                AttrValue::Omit | AttrValue::Bool(false) => {}
                AttrValue::Bool(true) => {
                    write!(f, " {key}")?;
                }
                AttrValue::Text(value) => {
                    if dangerous_url_attr(key, value) {
                        continue;
                    }

                    write!(f, " {key}=\"{}\"", escape_html(value))?;
                }
            }
        }

        write!(f, ">")?;

        if void_element(&self.tag) {
            return Ok(());
        }

        for child in &self.children {
            write!(f, "{child}")?;
        }

        write!(f, "</{}>", self.tag)
    }
}

// ---------- macro DSL ----------

#[macro_export]
macro_rules! __attr_name {
    ($name:ident) => {
        stringify!($name).replace("_", "-")
    };
}

#[macro_export]
macro_rules! __attrs {
    ($node:ident $(,)?) => {};

    ($node:ident, $key:ident = $value:expr, $($rest:tt)*) => {{
        $node.push_attr($crate::__attr_name!($key), $value);
        $crate::__attrs!($node, $($rest)*);
    }};

    ($node:ident, $key:ident = $value:expr $(,)?) => {{
        $node.push_attr($crate::__attr_name!($key), $value);
    }};
}

#[macro_export]
macro_rules! __props_attrs {
    ($props:ident $(,)?) => {};

    ($props:ident, $key:ident = $value:expr, $($rest:tt)*) => {{
        $props = $props.attr($crate::__attr_name!($key), $value);
        $crate::__props_attrs!($props, $($rest)*);
    }};

    ($props:ident, $key:ident = $value:expr $(,)?) => {{
        $props = $props.attr($crate::__attr_name!($key), $value);
    }};
}

#[macro_export]
macro_rules! props {
    ($($attrs:tt)*) => {{
        let mut props = $crate::Props::new();
        $crate::__props_attrs!(props, $($attrs)*);
        props
    }};
}

#[macro_export]
macro_rules! host {
    ($($attrs:tt)*) => {{
        $crate::Part::Host($crate::props!($($attrs)*))
    }};
}

#[macro_export]
macro_rules! __children {
    ($node:ident $(,)?) => {};

    ($node:ident, $child:ident ! ( $($args:tt)* ) ; $($rest:tt)*) => {{
        $node.push_child($child!($($args)*));
        $crate::__children!($node, $($rest)*);
    }};

    ($node:ident, $child:ident ! ( $($args:tt)* ) $($rest:tt)*) => {{
        $node.push_child($child!($($args)*));
        $crate::__children!($node, $($rest)*);
    }};

    ($node:ident, $child:ident ! { $($args:tt)* } ; $($rest:tt)*) => {{
        $node.push_child($child! { $($args)* });
        $crate::__children!($node, $($rest)*);
    }};

    ($node:ident, $child:ident ! { $($args:tt)* } $($rest:tt)*) => {{
        $node.push_child($child! { $($args)* });
        $crate::__children!($node, $($rest)*);
    }};

    ($node:ident, $text:literal $($rest:tt)*) => {{
        $node.push_child($text);
        $crate::__children!($node, $($rest)*);
    }};

    ($node:ident, $expr:expr ; $($rest:tt)*) => {{
        $node.push_child($expr);
        $crate::__children!($node, $($rest)*);
    }};

    ($node:ident, $expr:expr) => {{
        $node.push_child($expr);
    }};
}

#[macro_export]
macro_rules! __tag_inner {
    ($name:ident, $tag:literal, $d:tt) => {
        #[macro_export]
        macro_rules! $name {
            () => {{
                $crate::Part::Node($crate::VNode::Element($crate::VNode::element($tag)))
            }};

            (( $d($attrs:tt)* ) { $d($children:tt)* }) => {{
                let mut node = $crate::VNode::element($tag);
                $crate::__attrs!(node, $d($attrs)*);
                $crate::__children!(node, $d($children)*);
                $crate::Part::Node($crate::VNode::Element(node))
            }};

            ($d($key:ident = $value:expr),+ $d(,)?) => {{
                let mut node = $crate::VNode::element($tag);
                $d(
                    node.push_attr($crate::__attr_name!($key), $value);
                )+
                $crate::Part::Node($crate::VNode::Element(node))
            }};

            { $d($children:tt)* } => {{
                let mut node = $crate::VNode::element($tag);
                $crate::__children!(node, $d($children)*);
                $crate::Part::Node($crate::VNode::Element(node))
            }};
        }
    };
}

#[macro_export]
macro_rules! __tag {
    ($name:ident, $tag:literal) => {
        __tag_inner!($name, $tag, $);
    };
}

#[macro_export]
macro_rules! component {
    ($name:ident, |$props:ident, $children:ident| $body:block) => {
        #[allow(non_snake_case)]
        pub fn $name(
            $props: $crate::Props,
            $children: impl $crate::IntoChildren,
        ) -> $crate::VNode {
            let $children = $children.into_children();
            let result = $body;
            $crate::IntoComponentResult::into_component_result(result, stringify!($name))
        }
    };
}

// ---------- tags ----------

__tag!(a, "a");
__tag!(abbr, "abbr");
__tag!(address, "address");
__tag!(area, "area");
__tag!(article, "article");
__tag!(aside, "aside");
__tag!(audio, "audio");
__tag!(b, "b");
__tag!(base, "base");
__tag!(bdi, "bdi");
__tag!(bdo, "bdo");
__tag!(blockquote, "blockquote");
__tag!(body, "body");
__tag!(br, "br");
__tag!(button, "button");
__tag!(canvas, "canvas");
__tag!(caption, "caption");
__tag!(cite, "cite");
__tag!(code, "code");
__tag!(col, "col");
__tag!(colgroup, "colgroup");
__tag!(data, "data");
__tag!(datalist, "datalist");
__tag!(dd, "dd");
__tag!(del, "del");
__tag!(details, "details");
__tag!(dfn, "dfn");
__tag!(dialog, "dialog");
__tag!(div, "div");
__tag!(dl, "dl");
__tag!(dt, "dt");
__tag!(em, "em");
__tag!(embed, "embed");
__tag!(fieldset, "fieldset");
__tag!(figcaption, "figcaption");
__tag!(figure, "figure");
__tag!(footer, "footer");
__tag!(form, "form");
__tag!(h1, "h1");
__tag!(h2, "h2");
__tag!(h3, "h3");
__tag!(h4, "h4");
__tag!(h5, "h5");
__tag!(h6, "h6");
__tag!(head, "head");
__tag!(header, "header");
__tag!(hr, "hr");
__tag!(html, "html");
__tag!(i, "i");
__tag!(iframe, "iframe");
__tag!(img, "img");
__tag!(input, "input");
__tag!(ins, "ins");
__tag!(kbd, "kbd");
__tag!(label, "label");
__tag!(legend, "legend");
__tag!(li, "li");
__tag!(link, "link");
__tag!(main, "main");
__tag!(map, "map");
__tag!(mark, "mark");
__tag!(meta, "meta");
__tag!(meter, "meter");
__tag!(nav, "nav");
__tag!(noscript, "noscript");
__tag!(object, "object");
__tag!(ol, "ol");
__tag!(optgroup, "optgroup");
__tag!(option, "option");
__tag!(output, "output");
__tag!(p, "p");
__tag!(param, "param");
__tag!(picture, "picture");
__tag!(pre, "pre");
__tag!(progress, "progress");
__tag!(q, "q");
__tag!(rp, "rp");
__tag!(rt, "rt");
__tag!(ruby, "ruby");
__tag!(s, "s");
__tag!(samp, "samp");
__tag!(script, "script");
__tag!(section, "section");
__tag!(select, "select");
__tag!(small, "small");
__tag!(source, "source");
__tag!(span, "span");
__tag!(strong, "strong");
__tag!(style, "style");
__tag!(sub, "sub");
__tag!(summary, "summary");
__tag!(sup, "sup");
__tag!(svg, "svg");
__tag!(path, "path");
__tag!(polyline, "polyline");
__tag!(rect, "rect");
__tag!(circle, "circle");
__tag!(g, "g");
__tag!(line, "line");
__tag!(polygon, "polygon");
__tag!(r#use, "use");
__tag!(text, "text");
__tag!(table, "table");
__tag!(tbody, "tbody");
__tag!(td, "td");
__tag!(template, "template");
__tag!(textarea, "textarea");
__tag!(tfoot, "tfoot");
__tag!(th, "th");
__tag!(thead, "thead");
__tag!(time, "time");
__tag!(title, "title");
__tag!(tr, "tr");
__tag!(track, "track");
__tag!(u, "u");
__tag!(ul, "ul");
__tag!(video, "video");
__tag!(wbr, "wbr");

#[cfg(test)]
mod tests {
    use super::*;

    fn render(node: impl IntoNode) -> String {
        node.into_node().to_string()
    }

    #[test]
    fn basic_vnode_stringification() {
        assert_eq!(render(div!()), "<div></div>");
        assert_eq!(render(p! { "Hello World" }), "<p>Hello World</p>");
        assert_eq!(
            render(div! { span! { "Inner" } }),
            "<div><span>Inner</span></div>"
        );
        assert!(render(div! { "Text 1" p! { "Paragraph" } "Text 2" })
            .contains("<p>Paragraph</p>"));
    }

    #[test]
    fn void_elements_do_not_render_closing_tags_or_children() {
        assert_eq!(render(br!()), "<br>");
        assert_eq!(render(hr!()), "<hr>");
        assert_eq!(render(img!(src = "test.jpg")), r#"<img src="test.jpg">"#);
        assert_eq!(
            VNode::element("input").attr("type", "text").to_string(),
            r#"<input type="text">"#
        );
    }

    #[test]
    fn attributes_serialize_correctly() {
        assert_eq!(
            render(div!(id = "main", data_test = "123")),
            r#"<div data-test="123" id="main"></div>"#
        );

        assert_eq!(render(button!(disabled = true)), "<button disabled></button>");
        assert_eq!(render(button!(disabled = false)), "<button></button>");

        assert_eq!(
            VNode::element("input")
                .attr("type", "checkbox")
                .attr("checked", true)
                .to_string(),
            r#"<input checked type="checkbox">"#
        );
    }

    #[test]
    fn omit_attributes_are_not_rendered() {
        let el = VNode::element("div")
            .attr("id", Some("main"))
            .attr("hidden", Option::<String>::None)
            .attr("disabled", AttrValue::Omit);

        assert_eq!(el.to_string(), r#"<div id="main"></div>"#);
    }

    #[test]
    fn text_and_attribute_escaping_is_exhaustive() {
        let el = div!((title = r#"A & B " ' < >"#) {
            r#"X & Y " ' < >"#
        });

        let rendered = render(el);

        assert!(rendered.contains(r#"title="A &amp; B &quot; &#39; &lt; &gt;""#));
        assert!(rendered.contains("X &amp; Y &quot; &#39; &lt; &gt;"));
    }

    #[test]
    fn unsafe_raw_bypasses_escaping() {
        let el = div! {
            VNode::unsafe_raw("<span>raw</span>");
        };

        assert_eq!(render(el), "<div><span>raw</span></div>");
    }

    #[test]
    fn fragments_flatten_into_element_children() {
        let mut el = VNode::element("div");

        el.push_child(VNode::fragment([
            VNode::text("A"),
            VNode::Element(VNode::element("span").attr("id", "x")),
            VNode::text("B"),
        ]));

        assert_eq!(el.to_string(), r#"<div>A<span id="x"></span>B</div>"#);
    }

    #[test]
    fn option_children_render_some_or_empty_fragment() {
        let some = Some("Hello").into_node();
        let none = Option::<&str>::None.into_node();

        assert_eq!(some.to_string(), "Hello");
        assert_eq!(none.to_string(), "");
    }

    #[test]
    fn numbers_and_booleans_render_as_text_nodes() {
        let mut el = VNode::element("div");

        el.push_child("Start");
        el.push_child(0);
        el.push_child(false);
        el.push_child(42);
        el.push_child("End");

        assert_eq!(el.to_string(), "<div>Start0false42End</div>");
    }

    #[test]
    fn event_handler_attributes_are_stripped_case_insensitively() {
        let el = VNode::element("button")
            .attr("onclick", "evil()")
            .attr("onPointerOver", "evil()");

        assert_eq!(el.to_string(), "<button></button>");
    }

    #[test]
    fn framework_internal_attributes_are_stripped() {
        let el = VNode::element("div")
            .attr("state", "x")
            .attr("on", "click")
            .attr("emit", "custom")
            .attr("srcdoc", "<script></script>")
            .attr("id", "keep");

        assert_eq!(el.to_string(), r#"<div id="keep"></div>"#);
    }

    #[test]
    fn dangerous_javascript_urls_are_stripped() {
        assert_eq!(
            VNode::element("a")
                .attr("href", "javascript:alert(1)")
                .to_string(),
            "<a></a>"
        );

        assert_eq!(
            VNode::element("iframe")
                .attr("src", "   JAVASCRIPT:alert(1)")
                .to_string(),
            "<iframe></iframe>"
        );

        assert_eq!(
            VNode::element("form")
                .attr("action", "javascript:submit()")
                .to_string(),
            "<form></form>"
        );

        assert_eq!(
            VNode::element("object")
                .attr("data", "javascript:alert(1)")
                .to_string(),
            "<object></object>"
        );
    }

    #[test]
    fn invalid_attribute_keys_are_stripped() {
        let el = VNode::element("div")
            .attr("data-valid", "yes")
            .attr(r#"invalid="attr""#, "no")
            .attr(">onclick", "no")
            .attr("--custom", "var");

        let rendered = el.to_string();

        assert!(rendered.contains(r#"data-valid="yes""#));
        assert!(rendered.contains(r#"--custom="var""#));
        assert!(!rendered.contains("invalid="));
        assert!(!rendered.contains(">onclick"));
    }

    #[test]
    fn invalid_tags_render_nothing() {
        let el = Element {
            tag: "script>alert(1)</script".into(),
            attrs: BTreeMap::new(),
            children: vec![VNode::text("bad")],
        };

        assert_eq!(VNode::Element(el).to_string(), "");
    }

    #[test]
    fn props_bool_and_str_helpers_work() {
        let props = Props::new()
            .attr("enabled", true)
            .attr("disabled", "false")
            .attr("label", "Save")
            .attr("unknown", "yes");

        assert_eq!(props.bool("enabled"), Some(true));
        assert_eq!(props.bool("disabled"), Some(false));
        assert_eq!(props.bool("unknown"), None);
        assert_eq!(props.str("label"), Some("Save"));
        assert_eq!(props.str("enabled"), None);
    }

    component!(MyComponent, |props, children| {
        let disabled = props.bool("disabled").unwrap_or(false);
        let count = 3;

        [
            host!(class = "counter"),
            div!((class = "wrapper", data_active = count > 0) {
                button!((disabled = disabled, class = "font-bold") {
                    "Count: "
                    count;
                })

                children;
            }),
        ]
    });

    #[test]
    fn component_host_props_pattern_renders_custom_wrapper() {
        let rendered = MyComponent(
            props!(id = "my-component", disabled = false),
            [p! { "Rendered from Rust SSR" }],
        )
        .to_string();

        assert!(rendered.starts_with(r#"<ui-mycomponent class="counter">"#));
        assert!(rendered.contains(r#"<div class="wrapper" data-active>"#));
        assert!(rendered.contains(r#"<button class="font-bold">Count: 3</button>"#));
        assert!(rendered.contains("<p>Rendered from Rust SSR</p>"));
    }

    component!(SnakeCaseComponent, |_props, _children| {
        [
            host!(data_role = "widget"),
            span! { "Content" },
        ]
    });

    #[test]
    fn component_name_is_lowercased_and_underscores_become_dashes() {
        let rendered = SnakeCaseComponent(Props::new(), ()).to_string();

        assert_eq!(
            rendered,
            r#"<ui-snakecasecomponent data-role="widget"><span>Content</span></ui-snakecasecomponent>"#
        );
    }

    #[test]
    fn into_component_result_vec_becomes_fragment() {
        let nodes = vec![
            VNode::Element(VNode::element("span")),
            VNode::Element(VNode::element("b")),
        ];

        assert_eq!(
            nodes.into_component_result("Ignored").to_string(),
            "<span></span><b></b>"
        );
    }

    #[test]
    fn complete_app_snapshot() {
        fn app() -> impl IntoNode {
            html! {
                head! {
                    title! { "GIANT SSR" }
                    meta!(charset = "utf-8");
                    meta!(name = "viewport", content = "width=device-width, initial-scale=1");
                }

                body! {
                    MyComponent(
                        props!(id = "my-component", disabled = false),
                        [
                            p! { "Rendered from Rust SSR" }
                        ],
                    );
                }
            }
        }

        let rendered = format!("<!doctype html>{}", app().into_node());

        assert!(rendered.starts_with("<!doctype html><html>"));
        assert!(rendered.contains("<title>GIANT SSR</title>"));
        assert!(rendered.contains(r#"<meta charset="utf-8">"#));
        assert!(rendered.contains(r#"<ui-mycomponent class="counter">"#));
        assert!(rendered.contains("<p>Rendered from Rust SSR</p>"));
    }
}

use std::io::{Read, Write};
use std::net::TcpListener;

use giant::*;

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

fn main() {
    let listener = TcpListener::bind("127.0.0.1:8080").unwrap();

    println!("Zero-dependency bare-metal server running on http://127.0.0.1:8080");

    for stream in listener.incoming() {
        let mut stream = stream.unwrap();

        let mut buffer = [0; 1024];
        stream.read(&mut buffer).unwrap();

        let html_content = format!("<!doctype html>{}", app().into_node());

        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
            html_content.len(),
            html_content
        );

        stream.write_all(response.as_bytes()).unwrap();
        stream.flush().unwrap();
    }
}

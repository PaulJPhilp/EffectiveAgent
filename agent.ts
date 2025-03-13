import { Annotation, Command, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

import { config } from "dotenv";

interface State {
    user_id: string,
    message: string,
    data: object,
    completed: boolean,
}

const mode: string = "prod"
config()


if (mode === "dev") {
    loadPdfFiles();
}

// 1. Define the shapeof your state
const MyStateAnnotation = Annotation.Root({
    user_id: Annotation<string>,
    message: Annotation<string>,
    email: Annotation<string>,
    data: Annotation<object>,
    completed: Annotation<boolean>,
});

// Create a model and give it access to the tools
const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
})

// 2. Create nodes 
const node1 = async (state: typeof MyStateAnnotation) => {
    console.log("NODE 1")
    const user = { name: "MockUser" }

    return { message: `Hello, ${user.name}`, data: user };
};

const node2 = async (state: typeof MyStateAnnotation) => {
    console.log("NODE 2")
    // send a notification to an user
    //await notificationModel.send(state.data.email, state.message);

    return { completed: true };
};

const node3 = async (state: State) => {
    console.log("NODE 3")
    if (state.completed) {
        return new Command({
            update: { actions: ['notification_sent'] },
            goto: 'node4'
        })
    }

    return new Command({
        update: { actions: ['error'] },
        goto: "__end__"
    })
};

const node4 = async (state: State) => {
    console.log("NODE 4")
    return { actions: ['success'] };
};


export const graph = new StateGraph(MyStateAnnotation)
    .addNode("node1", node1)
    .addNode("node2", node2)
    .addNode("node3", node3)
    .addNode("node4", node4)
    .addEdge("__start__", "node1") // or you can use START variable from @langchain/langgraph
    .addConditionalEdges('node1', (state) => {
        return state.email ? 'node2' : "__end__"; // or you can use END variable from @langchain/langgraph
    })
    .addEdge("node2", "node3")
    .compile();

function loadPdfFiles() {
    throw new Error("Function not implemented.");
}

graph.invoke({
    user_id: "",
    message: "",
    email: "paul@paulphilp.com",
    data: {},
    completed: false
})
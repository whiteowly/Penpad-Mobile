import {Client, Databases} from 'react-native-appwrite';

const config = {
  endpoint: "https://fra.cloud.appwrite.io/v1",
  projectId: "68dc1f8c002b40670129",
  db: "todolisss",
  col:{
    tasks: "tasks",
  },


};

const client = new Client()
  .setEndpoint(config.endpoint) 
  .setProject(config.projectId); 

 const databases = new Databases(client);
export { client, databases, config };

  
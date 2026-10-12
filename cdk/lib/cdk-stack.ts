import {
  Cluster,
  ContainerImage,
  CpuArchitecture,
  FargateService,
  FargateTaskDefinition,
  OperatingSystemFamily,
} from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { Stack, StackProps } from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { join } from "path";
import { networking } from "./constructs/compute";
import {
  CfnInternetGateway,
  CfnVPCGatewayAttachment,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpointAwsService,
  Peer,
  Port,
  PrivateSubnet,
  PublicSubnet,
  SecurityGroup,
} from "aws-cdk-lib/aws-ec2";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import { ApplicationLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { vpc, subnet } = networking(this);

    const defaultVpc = vpc();

    const publicSubnet1 = subnet({
      type: "public",
      id: "PublicSubnet1",
      availabilityZone: this.availabilityZones[0],
      cidrBlock: "10.0.1.0/24",
      vpcId: defaultVpc.vpcId,
    }) as PublicSubnet;

    const publicSubnet2 = subnet({
      type: "public",
      id: "PublicSubnet2",
      availabilityZone: this.availabilityZones[1],
      cidrBlock: "10.0.2.0/24",
      vpcId: defaultVpc.vpcId,
    }) as PublicSubnet;

    const privateSubnet1 = subnet({
      type: "private",
      id: "PrivateSubnet1",
      availabilityZone: this.availabilityZones[0],
      cidrBlock: "10.0.3.0/24",
      vpcId: defaultVpc.vpcId,
    }) as PrivateSubnet;

    const privateSubnet2 = subnet({
      type: "private",
      id: "PrivateSubnet2",
      availabilityZone: this.availabilityZones[1],
      cidrBlock: "10.0.4.0/24",
      vpcId: defaultVpc.vpcId,
    }) as PrivateSubnet;

    const internetGateway = new CfnInternetGateway(this, "InternetGateway");
    const internetGatewayAttachment = new CfnVPCGatewayAttachment(
      this,
      "InternetGatewayAttachment",
      {
        vpcId: defaultVpc.vpcId,
        internetGatewayId: internetGateway.ref,
      },
    );

    publicSubnet1.addDefaultInternetRoute(
      internetGateway.ref,
      internetGatewayAttachment,
    );
    publicSubnet2.addDefaultInternetRoute(
      internetGateway.ref,
      internetGatewayAttachment,
    );

    // Keep the public ALB separate from the ECS service so it can be shared by
    // additional services. One ALB can front multiple target groups; add
    // host/path listener rules for each additional service instead of creating a
    // second public load balancer.
    const publicLoadBalancer = new ApplicationLoadBalancer(this, "PublicLoadBalancer", {
      vpc: defaultVpc,
      internetFacing: true,
      vpcSubnets: { subnets: [publicSubnet1, publicSubnet2] },
    });
    publicLoadBalancer.node.addDependency(publicSubnet1.internetConnectivityEstablished);
    publicLoadBalancer.node.addDependency(publicSubnet2.internetConnectivityEstablished);
    publicLoadBalancer.connections.allowFrom(
      Peer.anyIpv4(),
      Port.tcp(80),
      "Allow public HTTP traffic to the load balancer",
    );

    defaultVpc.addInterfaceEndpoint("EcrApiEndpoint", {
      service: InterfaceVpcEndpointAwsService.ECR,
      subnets: { subnets: [privateSubnet1, privateSubnet2] },
    });
    defaultVpc.addInterfaceEndpoint("EcrDockerEndpoint", {
      service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
      subnets: { subnets: [privateSubnet1, privateSubnet2] },
    });
    defaultVpc.addInterfaceEndpoint("CloudWatchLogsEndpoint", {
      service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: { subnets: [privateSubnet1, privateSubnet2] },
    });
    defaultVpc.addGatewayEndpoint("S3GatewayEndpoint", {
      service: GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnets: [privateSubnet1, privateSubnet2] }],
    });

    const cloudMapNamespaceName = "service.local";
    const apiCloudMapName = "api";
    const apiUrl = `http://${apiCloudMapName}.${cloudMapNamespaceName}`;

    const applicationCluster = new Cluster(this, "PhpCluster", {
      vpc: defaultVpc,
      defaultCloudMapNamespace: {
        name: cloudMapNamespaceName,
      },
    });

    const appSecurityGroup = new SecurityGroup(this, "AppServiceSecurityGroup", {
      vpc: defaultVpc,
      allowAllOutbound: true,
    });
    const apiSecurityGroup = new SecurityGroup(this, "ApiServiceSecurityGroup", {
      vpc: defaultVpc,
      allowAllOutbound: true,
    });
    apiSecurityGroup.connections.allowFrom(
      appSecurityGroup,
      Port.tcp(80),
      "Allow only the app service to call the API over HTTP",
    );

    const apiTaskDefinition = new FargateTaskDefinition(this, "ApiTaskDefinition", {
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: CpuArchitecture.ARM64,
        operatingSystemFamily: OperatingSystemFamily.LINUX,
      },
    });
    apiTaskDefinition.addContainer("ApiContainer", {
      // The API image is built from api/Dockerfile. It does not need API_URL
      // because it is the upstream service; only the app needs the API URL.
      image: ContainerImage.fromAsset(join(__dirname, "../../api"), {
        platform: Platform.LINUX_ARM64,
      }),
      portMappings: [{ containerPort: 80 }],
    });

    const apiService = new FargateService(this, "ApiService", {
      cluster: applicationCluster,
      taskDefinition: apiTaskDefinition,
      desiredCount: 1,
      assignPublicIp: false,
      vpcSubnets: { subnets: [privateSubnet1, privateSubnet2] },
      securityGroups: [apiSecurityGroup],
      cloudMapOptions: {
        name: apiCloudMapName,
      },
    });

    // The app is the public service behind the ALB. The API is private and is
    // reached through Cloud Map at apiUrl from inside the VPC.
    const appService = new ApplicationLoadBalancedFargateService(
      this,
      "AppService",
      {
        cluster: applicationCluster,
        cpu: 256,
        memoryLimitMiB: 512,
        runtimePlatform: {
          cpuArchitecture: CpuArchitecture.ARM64,
          operatingSystemFamily: OperatingSystemFamily.LINUX,
        },
        desiredCount: 1,
        publicLoadBalancer: true,
        loadBalancer: publicLoadBalancer,
        openListener: true,
        assignPublicIp: true,
        taskSubnets: { subnets: [publicSubnet1, publicSubnet2] },
        securityGroups: [appSecurityGroup],
        cloudMapOptions: {
          name: "app",
        },
        taskImageOptions: {
          environment: {
            API_URL: apiUrl,
          },
          image: ContainerImage.fromAsset(join(__dirname, "../../app"), {
            platform: Platform.LINUX_ARM64,
          }),
          containerPort: 80,
        },
      },
    );
    appService.node.addDependency(apiService);

    appService.targetGroup.configureHealthCheck({
      path: "/",
      healthyHttpCodes: "200",
    });
  }
}

import {
  Cluster,
  ContainerImage,
  CpuArchitecture,
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
  Peer,
  Port,
  PublicSubnet,
} from "aws-cdk-lib/aws-ec2";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import { ApplicationLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { vpc, subnet } = networking(this);

    const defaultVpc = vpc("vpc-0918d046dfe2ddafa");

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


    const service = new ApplicationLoadBalancedFargateService(
      this,
      "PhpService",
      {
        cluster: new Cluster(this, "PhpCluster", {
          vpc: defaultVpc,
        }),
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
        taskImageOptions: {
          // Builds the Dockerfile at the repository root and publishes it to a CDK-managed ECR asset repository during deployment.
          image: ContainerImage.fromAsset(join(__dirname, "../.."), {
            platform: Platform.LINUX_ARM64,
          }),
          containerPort: 80,
        },
      },
    );

    service.targetGroup.configureHealthCheck({
      path: "/",
      healthyHttpCodes: "200",
    });
  }
}
